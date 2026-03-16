# DokanX Python SDK

Minimal client for DokanX public APIs.

## Usage

```python
from dokanx_sdk import DokanXClient

client = DokanXClient("http://localhost:5001/api/v1", "dkx_...")
print(client.list_products("SHOP_ID"))
```
