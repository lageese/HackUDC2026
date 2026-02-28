#Define los "endpoints" que escuchará tu web (ej: /api/judge).

#Recibe la pregunta del usuario (ej: "Necesito un counter para Blastoise").

#Orquestador: Llama primero a la función de la Fase 1 y luego a la de la Fase 2.

#Contiene la lógica del veredicto: Si el SDK devuelve 3 Pokémon, este archivo calcula cuál es el "ganador" basándose en los stats.

import os
import re
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from sdk import DenodoAISDKClient, DenodoAISDKError


app = FastAPI(title="Decision Tool Backend", version="1.0.0")

sdk = DenodoAISDKClient()


# ----------------------------
# Models
# ----------------------------

class DecideConstraints(BaseModel):
    legendary: Optional[bool] = None
    type1: Optional[str] = None
    min_speed: Optional[float] = None
    min_attack: Optional[float] = None


class DecideWeights(BaseModel):
    attack: float = 0.5
    speed: float = 0.3
    defense: float = 0.2
    hp: float = 0.0


class DecideRequest(BaseModel):
    constraints: DecideConstraints = Field(default_factory=DecideConstraints)
    weights: DecideWeights = Field(default_factory=DecideWeights)
    top_k: int = 5


class RankedItem(BaseModel):
    name: str
    score: float
    features: Dict[str, Any]
    reasons: List[str]


class DecideResponse(BaseModel):
    recommended: RankedItem
    top: List[RankedItem]
    evidence: Dict[str, Any]


# ----------------------------
# Helpers
# ----------------------------

def _extract_view_name(metadata_answer: Dict[str, Any]) -> Optional[str]:
    """
    Intenta sacar el nombre de la view desde la respuesta del SDK.
    Como el formato puede variar, hacemos heurística:
    - Busca algo que parezca nombre de view en el texto "answer"
    - Si hay campos estructurados, úsalo
    """
    # 1) si viene "views" o similar (depende de implementación)
    for key in ("views", "view_ids", "allowed_views", "results", "metadata"):
        val = metadata_answer.get(key)
        if isinstance(val, list) and val:
            # intenta encontrar strings
            for item in val:
                if isinstance(item, str) and item.strip():
                    return item.strip()
                if isinstance(item, dict):
                    # comunes: name, view, id
                    for k in ("name", "view", "view_name", "id", "view_id"):
                        if isinstance(item.get(k), str) and item[k].strip():
                            return item[k].strip()

    # 2) intenta en el texto "answer"
    ans = metadata_answer.get("answer")
    if isinstance(ans, str) and ans.strip():
        # busca token tipo pokemon_view / admin.pokemon / etc
        m = re.search(r"\b([A-Za-z_][A-Za-z0-9_]*\.[A-Za-z_][A-Za-z0-9_]*)\b", ans)
        if m:
            return m.group(1)
        m2 = re.search(r"\b([A-Za-z_][A-Za-z0-9_]*_view)\b", ans, re.IGNORECASE)
        if m2:
            return m2.group(1)

    return None


def _safe_float(x: Any) -> Optional[float]:
    try:
        if x is None:
            return None
        if isinstance(x, (int, float)):
            return float(x)
        s = str(x).strip()
        if s == "":
            return None
        return float(s)
    except Exception:
        return None


def _normalize(values: List[Optional[float]]) -> List[Optional[float]]:
    nums = [v for v in values if isinstance(v, (int, float))]
    if not nums:
        return values
    mn, mx = min(nums), max(nums)
    if mx == mn:
        return [1.0 if v is not None else None for v in values]
    out: List[Optional[float]] = []
    for v in values:
        if v is None:
            out.append(None)
        else:
            out.append((v - mn) / (mx - mn))
    return out


def _build_reasons(features: Dict[str, Any], weights: Dict[str, float]) -> List[str]:
    # Explicación simple: top 2 contribuciones
    contribs: List[Tuple[str, float]] = []
    for k, w in weights.items():
        v = _safe_float(features.get(k))
        if v is not None:
            contribs.append((k, w * v))
    contribs.sort(key=lambda t: t[1], reverse=True)
    reasons = []
    for k, c in contribs[:2]:
        reasons.append(f"High {k} contribution (weight {weights[k]:.2f}).")
    return reasons or ["Selected as best overall match to weights and constraints."]


def _pick_row_dict(row: Any) -> Optional[Dict[str, Any]]:
    """
    El SDK puede devolver datos en distintas formas. Intentamos soportar:
      - lista de dicts
      - {"data":[{...}]}
      - {"answer": "...tabla..."} (difícil)
    """
    if isinstance(row, dict):
        return row
    return None


def _extract_rows(data_answer: Dict[str, Any]) -> List[Dict[str, Any]]:
    # 1) claves típicas
    for key in ("data", "rows", "result", "results"):
        val = data_answer.get(key)
        if isinstance(val, list) and val:
            rows = []
            for r in val:
                rd = _pick_row_dict(r)
                if rd:
                    rows.append(rd)
            if rows:
                return rows

    # 2) algunas respuestas vienen dentro de "answer" como markdown/tabla; no parseamos aquí.
    return []


# ----------------------------
# Endpoints
# ----------------------------

@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/decide", response_model=DecideResponse)
def decide(req: DecideRequest) -> DecideResponse:
    # ---- FASE 1 (obligatoria): Descubrimiento de metadatos
    meta_q = (
        "Identify which view contains Pokemon stats including Name, Type 1 (or Type_1), "
        "Attack, Defense, Speed, HP and Legendary. Return the view name."
    )
    try:
        meta = sdk.answer_metadata_question(meta_q, verbose=True)
    except DenodoAISDKError as e:
        raise HTTPException(status_code=502, detail=f"Metadata phase failed: {e}")

    view_name = _extract_view_name(meta) or os.getenv("POKEMON_VIEW_NAME", "").strip()
    if not view_name:
        # si no se puede extraer automáticamente, pide al usuario que lo ponga en env
        raise HTTPException(
            status_code=500,
            detail="Could not infer view name from metadata. Set POKEMON_VIEW_NAME env var (e.g. admin.pokemon_view).",
        )

    # ---- FASE 2 (obligatoria): Consulta de datos
    c = req.constraints
    filters = []
    if c.legendary is not None:
        filters.append(f"Legendary = {str(c.legendary).lower()}")
    if c.type1:
        # distintas columnas posibles
        filters.append(f"(\"Type 1\" = '{c.type1}' OR Type_1 = '{c.type1}' OR Type1 = '{c.type1}')")
    if c.min_speed is not None:
        filters.append(f"Speed >= {c.min_speed}")
    if c.min_attack is not None:
        filters.append(f"Attack >= {c.min_attack}")

    where_clause = ""
    if filters:
        where_clause = " where " + " AND ".join(filters)

    data_q = (
        f"From the view {view_name},{where_clause} return columns: "
        "Name, Attack, Defense, Speed, HP, Legendary and Type 1 (or Type_1). "
        "Limit to 200 rows."
    )

    try:
        data = sdk.answer_data_question(
            data_q,
            verbose=True,
            vql_execute_rows_limit=200,
            llm_response_rows_limit=200,
        )
    except DenodoAISDKError as e:
        raise HTTPException(status_code=502, detail=f"Data phase failed: {e}")

    rows = _extract_rows(data)
    if not rows:
        # fallback: si el SDK devuelve solo texto en "answer", avisa para ajustar
        raise HTTPException(
            status_code=500,
            detail="Data returned no structured rows. The SDK may be returning a textual table. "
                   "Try lowering markdown_response or adjusting SDK settings.",
        )

    # ---- Scoring (vuestro motor)
    weights = req.weights.model_dump()
    # asegúrate de que suman algo > 0
    if sum(max(0.0, float(w)) for w in weights.values()) <= 0:
        raise HTTPException(status_code=400, detail="Weights must sum to > 0.")

    # Extrae features numéricas
    names: List[str] = []
    attack: List[Optional[float]] = []
    defense: List[Optional[float]] = []
    speed: List[Optional[float]] = []
    hp: List[Optional[float]] = []
    feature_rows: List[Dict[str, Any]] = []

    for r in rows:
        name = r.get("Name") or r.get("name") or r.get("NAME")
        if not name:
            continue

        names.append(str(name))
        attack.append(_safe_float(r.get("Attack") or r.get("attack")))
        defense.append(_safe_float(r.get("Defense") or r.get("defense")))
        speed.append(_safe_float(r.get("Speed") or r.get("speed")))
        hp.append(_safe_float(r.get("HP") or r.get("hp")))
        feature_rows.append(r)

    if not names:
        raise HTTPException(status_code=500, detail="No usable rows after parsing Name/metrics.")

    # Normaliza para scoring comparable
    n_attack = _normalize(attack)
    n_defense = _normalize(defense)
    n_speed = _normalize(speed)
    n_hp = _normalize(hp)

    ranked: List[RankedItem] = []
    for i, name in enumerate(names):
        feats_norm = {
            "attack": n_attack[i],
            "defense": n_defense[i],
            "speed": n_speed[i],
            "hp": n_hp[i],
        }
        # penaliza missing con 0.4 por defecto (hackathon-friendly)
        def val_or_default(v: Optional[float], default: float = 0.4) -> float:
            return float(v) if v is not None else default

        score = (
            weights["attack"] * val_or_default(feats_norm["attack"]) +
            weights["speed"] * val_or_default(feats_norm["speed"]) +
            weights["defense"] * val_or_default(feats_norm["defense"]) +
            weights["hp"] * val_or_default(feats_norm["hp"])
        )

        # features originales (para mostrar)
        original = feature_rows[i]
        features_out = {
            "Attack": original.get("Attack"),
            "Defense": original.get("Defense"),
            "Speed": original.get("Speed"),
            "HP": original.get("HP"),
            "Legendary": original.get("Legendary"),
            "Type1": original.get("Type 1") or original.get("Type_1") or original.get("Type1"),
        }

        reasons = _build_reasons(
            {"attack": val_or_default(feats_norm["attack"]),
             "speed": val_or_default(feats_norm["speed"]),
             "defense": val_or_default(feats_norm["defense"]),
             "hp": val_or_default(feats_norm["hp"])},
            weights,
        )

        ranked.append(RankedItem(name=name, score=float(score), features=features_out, reasons=reasons))

    ranked.sort(key=lambda x: x.score, reverse=True)
    top = ranked[: max(1, req.top_k)]

    evidence = {
        "phase1_metadata_question": meta_q,
        "phase1_raw": meta,
        "inferred_view": view_name,
        "phase2_data_question": data_q,
        # no metemos todo "data" si es enorme; pero puedes si queréis trazabilidad total
        "rows_used": len(ranked),
    }

    return DecideResponse(
        recommended=top[0],
        top=top,
        evidence=evidence,
    )