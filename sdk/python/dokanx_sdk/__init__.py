import requests


class DokanXClient:
    def __init__(self, base_url, api_key):
        self.base_url = base_url.rstrip("/") if base_url else "http://localhost:5001/api/v1"
        self.api_key = api_key

    def _request(self, path, method="GET", json=None):
        url = f"{self.base_url}{path}"
        headers = {
            "Content-Type": "application/json",
            "x-api-key": self.api_key,
        }
        response = requests.request(method, url, json=json, headers=headers, timeout=10)
        if not response.ok:
            message = "Request failed"
            try:
                message = response.json().get("message", message)
            except Exception:
                pass
            raise Exception(message)
        return response.json()

    def list_products(self, shop_id=None):
        query = f"?shopId={shop_id}" if shop_id else ""
        return self._request(f"/products{query}")

    def create_order(self, payload):
        return self._request("/orders", method="POST", json=payload)
