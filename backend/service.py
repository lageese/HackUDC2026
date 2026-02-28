import httpx

DENODO_SDK_URL = "http://localhost:8000"
# Credenciales por defecto según el manual del Hackathon
AUTH = ("admin", "admin") 

async def process_decision(problem_statement: str):
    async with httpx.AsyncClient(timeout=60.0, auth=AUTH) as client:
        # 1. Metadata
        meta_prompt = {"question": f"Analiza qué tablas son útiles para: {problem_statement}"}
        meta_res = await client.post(f"{DENODO_SDK_URL}/answerMetadataQuestion", json=meta_prompt)
        
        print("META STATUS:", meta_res.status_code)
        print("META RESPONSE:", meta_res.text)

        meta_res.raise_for_status()
        metadata_context = meta_res.json()

        # 2. Data
        contexto_limpio = metadata_context.get("answer", str(metadata_context)) 
        data_prompt = {"question": f"Contexto: {contexto_limpio}. Problema: {problem_statement}"}
        data_res = await client.post(f"{DENODO_SDK_URL}/answerDataQuestion", json=data_prompt)

        print("DATA STATUS:", data_res.status_code)
        print("DATA RESPONSE:", data_res.text)

        data_res.raise_for_status()

        return {
            "analysis": metadata_context,
            "decision": data_res.json()
        }