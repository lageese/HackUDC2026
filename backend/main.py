from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict
from sdk import DenodoAISDKClient
import ollama
import json

class ProblemRequest(BaseModel):
    problem: str

class CSVAnalysisRequest(BaseModel):
    headers: list[str]
    sample_data: list[str]


class DecideRequest(BaseModel):
    topic: str 
    display_column: str              
    filters: Dict[str, Any]       
    scoring_weights: Dict[str, float] 
    top_k: int    

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sdk = DenodoAISDKClient(auth_header="Basic YWRtaW46YWRtaW4=")

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/clasificar-csv")
async def clasificar_csv(req: CSVAnalysisRequest):

    prompt = f"""
    Eres un experto en clasificación de bases de datos.

    Analiza las siguientes columnas:
    {req.headers}

    Y esta fila de ejemplo:
    {req.sample_data}

    Tu tarea:
    1. Determinar la temática real de la base de datos.
    2. Responder SOLO con un JSON válido.
    3. No incluyas explicaciones ni texto adicional.

    Reglas:
    - "categoria" debe ser una categoría REAL basada en el contenido.
    - Máximo 3 palabras.
    - No uses frases como "max 3 palabras" o "5 palabras".
    - No repitas las instrucciones.
    - No uses markdown.
    - Devuelve únicamente el objeto JSON.

    Formato obligatorio:

    {{
    "categoria": "<categoria real>",
    "confianza": "alta | media | baja",
    "razon": "<breve justificacion basada en columnas>"
    }}
    """

    try:
        response = ollama.generate(
            model='llama3',
            prompt=prompt,
            options={"temperature": 0}
        )

        raw = response['response'].strip()

        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            print("Respuesta inválida:", raw)
            return {
                "categoria": "Error IA",
                "confianza": "baja",
                "razon": "JSON invalido"
            }

    except Exception as e:
        print(f"Error con Ollama: {e}")
        return {
            "categoria": "Error sistema",
            "confianza": "baja",
            "razon": "Fallo interno"
        }

def _extract_rows(data_answer: dict) -> list:

    execution_result = data_answer.get("execution_result", {})
    if not isinstance(execution_result, dict):
        return []

    lista_final = []
    
    for row_key, columns in execution_result.items():
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
    
    try:
        datasource = req.topic
        
        if not datasource:
            raise HTTPException(status_code=404, detail=f"No se encontró ninguna tabla relacionada con '{req.topic}'.")
        
        tabla_limpia = datasource.split(".")[-1]

        if req.topic.lower() not in tabla_limpia.lower():
            raise HTTPException(status_code=400, detail=f"La tabla encontrada '{tabla_limpia}' no parece relevante para el tema '{req.topic}'.")
        
    except HTTPException as he:
        raise he    
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al buscar la tabla: {str(e)}")
    
    display_col = req.display_column
    columnas_puntos = list(req.scoring_weights.keys())

    todas_las_cols = [f'"{display_col}"'] + [f'"{c}"' for c in columnas_puntos]

    columnas_sql = ", ".join([f'"{c}"' for c in todas_las_cols])

    where_clause = ""
    if req.filters:
        partes_filtro = []
        for col, val in req.filters.items():
            if isinstance(val, str):
                valor_upper=val.upper().strip()
                partes_filtro.append(f"UPPER(\"{col}\") = '{valor_upper}'")
            else:
                partes_filtro.append(f"\"{col}\" = {val}")
        
        where_clause = " WHERE " + " AND ".join(partes_filtro)


    
    data_q = f"SELECT {columnas_sql} FROM {datasource}{where_clause} LIMIT 10"
    
    try:
        data_res = sdk.answer_data_question(data_q)
        
        rows = _extract_rows(data_res)
        
        if not rows:
            return {"message": "No se encontraron elementos con esos filtros", "results": []}

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error al extraer datos: {str(e)}")
    
    ranking = []
    for item in rows:
        score = 0
        nombre_real = item.get(display_col, "Desconocido")
        item_lower = {k.lower(): v for k, v in item.items()}
        
        for col, peso in req.scoring_weights.items():
            val = item_lower.get(col.lower(), 0)
            try:
                score += float(val) * peso
            except:
                continue
        
        ranking.append({
            "name": nombre_real,
            "score": round(score, 2)
        })

    ranking.sort(key=lambda x: x["score"], reverse=True)
    
    return {
        "tema": req.topic,
        "tabla": tabla_limpia,
        "ganadores": ranking[:req.top_k]
    }

class InterpretRequest(BaseModel):
    prompt: str
    dataset: str

@app.post("/interpret")
def interpret_query(req: InterpretRequest):
    try:
        meta_q = f"Describe columns for the table {req.dataset}"
        meta_res = sdk.answer_metadata_question(meta_q)
        
        views = meta_res.get("execution_result", {}).get("views", [])
        if not views:
            raise HTTPException(status_code=404, detail="Tabla no encontrada")

        columnas = [c['columnName'] for c in views[0]['view_json']['schema']]

        prompt_maestro = f"""
        Dataset: {req.dataset}
        Columns: {columnas}
        User Query: "{req.prompt}"

        Instructions:
        1. If the query cannot be answered with these columns, return: {{"error": "incompatible"}}
        2. Otherwise, return ONLY a JSON with this structure:
        3. 'display_column' is the column with the name of the element (e.g., name).
        {{
          "topic": "{req.dataset}",
          "display_column": "column_name",
          "filters": {{"column": "value"}},
          "scoring_weights": {{"numeric_column": 1.0}},
          "explanation": "short text",
          "top_k": int
        }}
        """

        final_res = sdk.answer_metadata_question(prompt_maestro)
        raw_answer = final_res.get("answer", "")

        start = raw_answer.find('{')
        end = raw_answer.rfind('}')
        
        if start == -1:
            raise HTTPException(status_code=422, detail="No se pudo generar JSON")

        clean_json = json.loads(raw_answer[start:end+1])

        if "error" in clean_json:
            raise HTTPException(status_code=422, detail="Pregunta incompatible con el dataset")

        return clean_json

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error en la interpretación")