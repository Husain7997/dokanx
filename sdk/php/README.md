# DokanX PHP SDK

Minimal client for DokanX public APIs.

## Usage

```php
require_once "src/Client.php";

$client = new DokanXClient("http://localhost:5001/api/v1", "dkx_...");
print_r($client->listProducts("SHOP_ID"));
```
