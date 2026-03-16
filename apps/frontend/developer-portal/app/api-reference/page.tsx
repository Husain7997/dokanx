export default function ApiReferencePage() {
  return (
    <section className="grid gap-6 rounded-3xl border border-white/40 bg-white/70 p-8">
      <div>
        <h2 className="dx-display text-2xl">API Reference</h2>
        <p className="text-sm text-muted-foreground">
          Public API v1 endpoints for external developers. All requests require
          <code className="mx-1 rounded bg-white/80 px-2 py-0.5 text-xs">x-api-key</code>.
        </p>
      </div>
      <div className="grid gap-3 text-xs text-muted-foreground">
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">OAuth</p>
          <p>GET /oauth/consent</p>
          <p>GET /oauth/authorize</p>
          <p>POST /oauth/token</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Products</p>
          <p>GET /v1/products?shopId=</p>
          <p>GET /v1/products/:productId</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Orders</p>
          <p>POST /v1/orders</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Customers</p>
          <p>GET /v1/customers?shopId=</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Inventory</p>
          <p>GET /v1/inventory?shopId=</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Wallet</p>
          <p>GET /v1/wallets?shopId=</p>
          <p>POST /v1/wallets/credit</p>
          <p>POST /v1/wallets/debit</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Payments</p>
          <p>POST /v1/payments/initiate</p>
        </div>
        <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Shipping</p>
          <p>GET /v1/shipping/rates</p>
        </div>
      </div>
    </section>
  );
}
