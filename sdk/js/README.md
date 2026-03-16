# DokanX JavaScript SDK

Minimal client for DokanX public APIs.

## Usage

```js
const { DokanXClient } = require("./index");

const client = new DokanXClient({
  baseUrl: "http://localhost:5001/api/v1",
  apiKey: "dkx_..."
});

client.listProducts("SHOP_ID").then(console.log);
```
