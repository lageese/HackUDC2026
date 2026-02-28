import os
import requests

from typing import Any, Dict, Optional

class DenodoAISDKError(RuntimeError):
    """Error para problemas de Denodo AI SDK."""
    pass


class DenodoAISDKClient:
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
            headers["Authorization"] = self.auth_header
        return headers

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            response = requests.post(url, json=payload, headers=self._headers(), timeout=self.timeout_s)

            if response.status_code >= 400:
                raise DenodoAISDKError(f"Error {response.status_code} al llamar a {url}: {response.text}")
            
            return response.json()
        except requests.exceptions.RequestException as e: 
            raise DenodoAISDKError(f"Error de conexión con {url}: {str(e)}") from e

    def answer_metadata_question(self, question: str, **kwargs: Any) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
        "question": question,
        "verbose": kwargs.pop("verbose", True),
        "markdown_response": False,
        }
        payload.update(kwargs)
        return self._post("/answerMetadataQuestion", payload)

    def answer_data_question(self, question: str,  **kwargs: Any) -> Dict[str, Any]:
        payload = {"question": question, "verbose": True, "markdown_response": False, "vql_execute_rows_limit": 10}
        payload.update(kwargs)
        return self._post("/answerDataQuestion", payload)