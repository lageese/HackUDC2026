from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import service  # Corregido el nombre
from pydantic import BaseModel
import ollama # <--- Importa la librería

app = FastAPI(title="HackUDC Decision Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProblemRequest(BaseModel):
    problem: str

@app.post("/api/decide")
async def get_decision(request: ProblemRequest):
    try:
        # Usamos el módulo services
        result = await service.process_decision(request.problem)
        return {"status": "success", "data": result}
    except Exception as e:
        # Log del error real en consola para debuggear
        print(f"DEBUG ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}

class CSVAnalysisRequest(BaseModel):
    headers: list[str]
    sample_data: list[str]

@app.post("/api/clasificar-csv")


# ... (tus otros imports y configuración de CORS)

class CSVAnalysisRequest(BaseModel):
    headers: list[str]
    sample_data: list[str]

@app.post("/api/clasificar-csv")
async def clasificar_csv(req: CSVAnalysisRequest):
    # Construimos el prompt 
    prompt = f"""
    Eres un clasificador de bases de datos experto.
    Analiza las siguientes columnas de un archivo CSV: {req.headers}
    Aquí tienes una fila de ejemplo con datos reales: {req.sample_data}
    
    Deduce la categoría principal de esta base de datos. 
    Responde ÚNICAMENTE con el nombre de la categoría (máximo 3 palabras, ej: 'Fútbol Histórico', 'Recursos Humanos').
    """

    try:
        # Importante: Asegúrate de que el servicio de Ollama esté corriendo
        response = ollama.generate(model='llama3', prompt=prompt)
        
        categoria_detectada = response['response'].strip()
        # Limpieza rápida
        categoria_detectada = categoria_detectada.replace('"', '').replace('.', '').replace("'", "")
        
        return {"categoria": categoria_detectada}

    except Exception as e:
        print(f"Error con Ollama: {e}")
        return {"categoria": "Datos Generales"}