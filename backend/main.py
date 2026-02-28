#Define los "endpoints" que escuchará tu web (ej: /api/judge).

#Recibe la pregunta del usuario (ej: "Necesito un counter para Blastoise").

#Orquestador: Llama primero a la función de la Fase 1 y luego a la de la Fase 2.

#Contiene la lógica del veredicto: Si el SDK devuelve 3 Pokémon, este archivo calcula cuál es el "ganador" basándose en los stats.

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
from sdk import DenodoAISDKClient

class DecideRequest(BaseModel):
    topic: str                    
    filters: Dict[str, Any]       
    scoring_weights: Dict[str, float] 
    top_k: int = 3      

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Permite que cualquier página web te consulte
    allow_credentials=True,
    allow_methods=["*"],      # Permite POST, OPTIONS, GET, etc.
    allow_headers=["*"],      # Permite todos los encabezados
)

sdk = DenodoAISDKClient(auth_header="Basic YWRtaW46YWRtaW4=") # Autenticacion basica admin:admin

def _extract_rows(data_answer: dict) -> list:

    execution_result = data_answer.get("execution_result", {})
    if not isinstance(execution_result, dict):
        return []

    lista_final = []
    
    for row_key, columns in execution_result.items():
        # Saltamos claves que no sean de filas si las hubiera
        if not row_key.startswith("Row"):
            continue

        fila_objeto = {}

        for col in columns:
            nombre = col.get("columnName")
            valor = col.get("value")
            fila_objeto[nombre] = valor
        
        lista_final.append(fila_objeto)
    
    return lista_final

@app.get("/")
def home():
    return {"status": "online", "message": "Ranking Engine de Denodo listo"}

@app.post("/decide")
def decide(req: DecideRequest):
    # Aqui la ia nos responderá con el nombre de la vista del datasource
    meta_q = f"Identify the technical view name in Denodo that contains information about '{req.topic}'."
    print(f"DEBUG: Pregunta de metadata -> {meta_q}")
    
    try:
        # SDK buscará en los metadatos
        meta_res = sdk.answer_metadata_question(meta_q)
        print(f"DEBUG: Respuesta de metadata -> {meta_res}")

        datasource = meta_res.get("tables_used", [None])[0] # Obtenemos la primera tabla usada (admin.tabla), o None si no hay tablas
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"No se encontró ninguna tabla relacionada con '{req.topic}'.")
        
        tabla_limpia = datasource.split(".")[-1] # Obtenemos solo el nombre de la tabla sin el prefijo del datasource
        print(f"DEBUG: Tabla encontrada -> {tabla_limpia}")

        if req.topic.lower() not in tabla_limpia.lower():
            raise HTTPException(status_code=400, detail=f"La tabla encontrada '{tabla_limpia}' no parece relevante para el tema '{req.topic}'.")
        
    except HTTPException as he:
        raise he    
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al buscar la tabla: {str(e)}")
    
    columnas_puntos = list(req.scoring_weights.keys())

    todas_las_cols = ["name"] + columnas_puntos

    columnas_sql = ", ".join([f'"{c}"' for c in todas_las_cols])

    print(f"DEBUG: Columnas que vamos a pedir -> {columnas_sql}")

    where_clause = ""
    if req.filters:
        partes_filtro = []
        for col, val in req.filters.items():
            if isinstance(val, str):
                partes_filtro.append(f"\"{col}\" = '{val}'")
            # Si es número, va sin comillas
            else:
                partes_filtro.append(f"\"{col}\" = {val}")
        
        where_clause = " WHERE " + " AND ".join(partes_filtro)


    
    # Montamos la query final (usamos view_full_name que tiene el admin.)
    data_q = f"SELECT {columnas_sql} FROM {datasource}{where_clause} LIMIT 50"
    print(f"DEBUG: Query final de datos -> {data_q}")
    
    try:
        # Llamamos al SDK para obtener los datos reales
        data_res = sdk.answer_data_question(data_q)
        print(f"DEBUG: ROWS -> {data_res}")
        
        # Extraemos las filas de la respuesta (usando la funcion auxiliar)
        # Asegúrate de tener definida _extract_rows fuera de 'decide'
        rows = _extract_rows(data_res)
        
        if not rows:
            return {"message": "No se encontraron elementos con esos filtros", "results": []}
            
        print(f"DEBUG: Hemos recuperado {len(rows)} filas de Denodo")

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al extraer datos: {str(e)}")
    
    ranking = []
    for item in rows:
        score = 0
        # Normalizamos las llaves a minúsculas para evitar fallos de Case Sensitivity
        item_lower = {k.lower(): v for k, v in item.items()}
        
        for col, peso in req.scoring_weights.items():
            val = item_lower.get(col.lower(), 0)
            try:
                score += float(val) * peso
            except:
                continue
        
        ranking.append({
            "name": item_lower.get("name", "Unknown"),
            "score": round(score, 2)
        })

    # Ordenar y cortar por top_k
    ranking.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "tema": req.topic,
        "tabla": tabla_limpia,
        "ganadores": ranking[:req.top_k]
    }