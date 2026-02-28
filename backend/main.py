from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import service  # Corregido el nombre

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