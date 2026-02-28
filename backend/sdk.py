#Contiene las funciones puras de requests.post() para hablar con el AI SDK (answerMetadataQuestion y answerDataQuestion).

#Gestiona los errores (ej: si Denodo está apagado).

import os
from typing import Any, Dict, Optional

import requests


class DenodoAISDKError(RuntimeError):
    pass


class DenodoAISDKClient:
    """
    Cliente simple para Denodo AI SDK.
    Configura:
      - DENODO_AI_SDK_BASE_URL (default: http://localhost:8008)
      - DENODO_AI_SDK_AUTH (opcional): "Bearer <token>" o "Basic <base64...>"
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        auth_header: Optional[str] = None,
        timeout_s: int = 60,
    ) -> None:
        self.base_url = (base_url or os.getenv("DENODO_AI_SDK_BASE_URL", "http://localhost:8008")).rstrip("/")
        self.auth_header = auth_header or os.getenv("DENODO_AI_SDK_AUTH", "").strip()
        self.timeout_s = timeout_s

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.auth_header:
            # Expect full value: "Bearer xxx" OR "Basic xxx"
            headers["Authorization"] = self.auth_header
        return headers

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            r = requests.post(url, json=payload, headers=self._headers(), timeout=self.timeout_s)
        except requests.RequestException as e:
            raise DenodoAISDKError(f"Network error calling {url}: {e}") from e

        # AI SDK a veces devuelve errores como {"detail": {...}}
        if r.status_code >= 400:
            try:
                body = r.json()
            except Exception:
                body = {"raw": r.text}
            raise DenodoAISDKError(f"HTTP {r.status_code} from {path}: {body}")

        try:
            return r.json()
        except Exception as e:
            raise DenodoAISDKError(f"Invalid JSON response from {path}: {r.text}") from e

    def answer_metadata_question(self, question: str, **kwargs: Any) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "question": question,
            # defaults útiles para estabilidad
            "verbose": kwargs.pop("verbose", True),
            "markdown_response": kwargs.pop("markdown_response", True),
        }
        payload.update(kwargs)
        return self._post("/answerMetadataQuestion", payload)

    def answer_data_question(self, question: str, **kwargs: Any) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "question": question,
            "verbose": kwargs.pop("verbose", True),
            "markdown_response": kwargs.pop("markdown_response", True),
            # evita devolver demasiadas filas en el LLM output
            "vql_execute_rows_limit": kwargs.pop("vql_execute_rows_limit", 200),
            "llm_response_rows_limit": kwargs.pop("llm_response_rows_limit", 50),
        }
        payload.update(kwargs)
        return self._post("/answerDataQuestion", payload)