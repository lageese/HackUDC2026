from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import service
import ollama
import json

app = FastAPI(title="HackUDC Decision Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- MODELOS --------

class ProblemRequest(BaseModel):
    problem: str

class CSVAnalysisRequest(BaseModel):
    headers: list[str]
    sample_data: list[str]

# -------- ENDPOINTS --------

@app.post("/api/decide")
async def get_decision(request: ProblemRequest):
    try:
        result = await service.process_decision(request.problem)
        return {"status": "success", "data": result}
    except Exception as e:
        print(f"DEBUG ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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