"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@dokanx/auth";
import { Alert, Badge, Button } from "@dokanx/ui";
import { Expand, Minus, Plus, Printer, ReceiptText, ScanBarcode, Search, Trash2 } from "lucide-react";

import { createPosOrder, getProductByBarcode, listCustomers, listShopProducts, openPosSession } from "@/lib/runtime-api";
import { usePosCart } from "@/hooks/usePosCart";

type PosProduct = {
  _id?: string;
  id?: string;
  name?: string;
  category?: string;
  barcode?: string;
  price?: number;
  stock?: number;
  shopId?: string;
  imageUrl?: string;
};

type PosCustomer = {
  _id?: string;
  globalCustomerId?: string;
  name?: string;
  phone?: string;
};

function productId(product: PosProduct) {
  return String(product._id || product.id || "");
}

function formatMoney(value: number) {
  return `BDT ${Number(value || 0).toFixed(2)}`;
}

export default function PosPage() {
  const auth = useAuth();
  const shopId = String(auth.user?.shopId || "");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartItemCount } = usePosCart();

  const checkout = useCallback(async () => {
    if (!cart.length || checkingOut) {
      if (!cart.length) setMessage("Cart is empty.");
      return;
    }

    setCheckingOut(true);
    setError(null);
    setMessage(null);
    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const sessionResponse = await openPosSession({ openingBalance: 0 });
        const data = sessionResponse.data as { _id?: string; id?: string } | undefined;
        activeSessionId = String(data?._id || data?.id || "");
        setSessionId(activeSessionId || null);
      }

      await createPosOrder({
        paymentType: "cash",
        customerId: selectedCustomerId || undefined,
        items: cart.map((item) => ({
          product: item.product.id,
          quantity: item.quantity,
        })),
      });

      clearCart();
      setMessage("Cash checkout complete. Receipt is ready to print.");
      window.setTimeout(() => searchRef.current?.focus(), 50);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "POS checkout failed.");
    } finally {
      setCheckingOut(false);
    }
  }, [cart, checkingOut, clearCart, selectedCustomerId, sessionId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    async function loadPosData() {
      if (!shopId) {
        setError("Merchant shop is not attached to this account.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const [productResponse, customerResponse] = await Promise.all([
          listShopProducts(shopId),
          listCustomers().catch(() => ({ data: [] })),
        ]);
        if (!active) return;
        setProducts(Array.isArray(productResponse.data) ? productResponse.data as PosProduct[] : []);
        setCustomers(Array.isArray(customerResponse.data) ? customerResponse.data as PosCustomer[] : []);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load POS data.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadPosData();
    return () => {
      active = false;
    };
  }, [shopId]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "F1") {
        event.preventDefault();
        void checkout();
      }
      if (event.key === "F2") {
        event.preventDefault();
        clearCart();
        setMessage("Cart cleared.");
      }
      if (event.key === "F3") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "F4") {
        event.preventDefault();
        window.print();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [checkout, clearCart]);

  const categories = useMemo(() => {
    const values = products.map((product) => String(product.category || "General")).filter(Boolean);
    return ["ALL", ...Array.from(new Set(values))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const matchesCategory = (product: PosProduct) =>
      selectedCategory === "ALL" || String(product.category || "General") === selectedCategory;
    const matchesQuery = (product: PosProduct) => {
      if (!debouncedQuery) return true;
      return [product.name, product.category, product.barcode]
        .some((value) => String(value || "").toLowerCase().includes(debouncedQuery));
    };
    return products.filter((product) => matchesCategory(product) && matchesQuery(product)).slice(0, 48);
  }, [debouncedQuery, products, selectedCategory]);

  async function handleBarcodeEnter() {
    const value = query.trim();
    if (!value || !shopId) return;
    const localMatch = products.find((product) => String(product.barcode || "").toLowerCase() === value.toLowerCase());
    if (localMatch) {
      addProduct(localMatch);
      setQuery("");
      return;
    }
    try {
      const response = await getProductByBarcode(value, shopId);
      const product = response.data as PosProduct | undefined;
      if (!product || !productId(product)) throw new Error("No product matched this barcode.");
      addProduct(product);
      setQuery("");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Barcode scan failed.");
    }
  }

  function addProduct(product: PosProduct) {
    const id = productId(product);
    if (!id) return;
    addToCart({
      id,
      name: String(product.name || "Product"),
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
      shopId,
      shopName: "Current shop",
    });
    setMessage(`${product.name || "Product"} added.`);
  }

  async function requestFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    } catch {
      setMessage("Fullscreen is blocked by this browser until the next user gesture.");
    }
  }

  const total = getCartTotal();
  const itemCount = getCartItemCount();

  return (
    <div className="min-h-screen bg-background text-foreground lg:pr-[370px]">
      <div className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur print:hidden">
        <div className="grid gap-3 xl:grid-cols-[minmax(360px,1fr)_260px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleBarcodeEnter();
                }
              }}
              placeholder="Scan barcode or search product..."
              className="flex h-12 w-full rounded-[var(--radius-md)] border border-input bg-card px-3 pl-10 text-base outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            />
          </label>
          <select
            className="h-12 rounded-[var(--radius-md)] border border-border bg-card px-3 text-sm"
            value={selectedCustomerId}
            onChange={(event) => setSelectedCustomerId(event.target.value)}
          >
            <option value="">Walk-in customer</option>
            {customers.slice(0, 80).map((customer) => (
              <option key={String(customer.globalCustomerId || customer._id)} value={String(customer.globalCustomerId || customer._id)}>
                {customer.name || customer.phone || "Customer"}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={sessionId ? "success" : "neutral"}>{sessionId ? "Session open" : "Auto session"}</Badge>
            <span>F1 Checkout</span>
            <span>F2 Clear</span>
            <span>F3 Search</span>
            <span>F4 Print</span>
            <Button size="sm" variant="secondary" onClick={requestFullscreen}><Expand size={15} /> Fullscreen</Button>
          </div>
        </div>
      </div>

      <main className="px-4 py-4">
        {(error || message) ? (
          <div className="mb-4 grid gap-2 print:hidden">
            {error ? <Alert variant="warning">{error}</Alert> : null}
            {message ? <Alert variant="success">{message}</Alert> : null}
          </div>
        ) : null}

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 print:hidden">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`h-10 shrink-0 rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition ${
                selectedCategory === category ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"
              }`}
              onClick={() => setSelectedCategory(category)}
            >
              {category === "ALL" ? "All products" : category}
            </button>
          ))}
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 12 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-[var(--radius-md)] border border-border bg-muted/40" />
            ))
          ) : filteredProducts.length ? (
            filteredProducts.map((product) => {
              const id = productId(product);
              const stock = Number(product.stock || 0);
              const disabled = !id || stock <= 0;
              return (
                <button
                  key={id || product.name}
                  type="button"
                  disabled={disabled}
                  className="min-h-36 rounded-[var(--radius-md)] border border-border bg-card p-4 text-left shadow-[var(--shadow-sm)] transition hover:-translate-y-0.5 hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => addProduct(product)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{product.name || "Product"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{product.category || "General"}</p>
                    </div>
                    <Badge variant={stock > 0 ? "success" : "warning"}>{stock > 0 ? stock : "Out"}</Badge>
                  </div>
                  <p className="mt-5 text-2xl font-semibold">{formatMoney(Number(product.price || 0))}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{product.barcode ? `Barcode ${product.barcode}` : "Tap to add instantly"}</p>
                </button>
              );
            })
          ) : (
            <div className="rounded-[var(--radius-md)] border border-dashed border-border p-8 text-center text-sm text-muted-foreground sm:col-span-2 xl:col-span-3">
              No products found.
            </div>
          )}
        </section>
      </main>

      <aside className="fixed right-0 top-0 z-40 flex h-full w-[350px] flex-col border-l border-border bg-white shadow-xl print:static print:w-full print:border-0 print:shadow-none">
        <div className="border-b border-border p-4 print:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">POS Cart</p>
              <h2 className="text-xl font-semibold">{itemCount} items</h2>
            </div>
            <Button size="sm" variant="secondary" onClick={() => window.print()}><Printer size={15} /> Print</Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length ? (
            <div className="grid gap-3">
              {cart.map((item) => (
                <div key={item.product.id} className="rounded-[var(--radius-md)] border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{item.product.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatMoney(item.product.price)} each</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove item"
                      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-border text-muted-foreground hover:text-destructive print:hidden"
                      onClick={() => removeFromCart(item.product.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}><Minus size={14} /></Button>
                    <span className="min-w-8 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button size="sm" variant="secondary" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}><Plus size={14} /></Button>
                    <span className="ml-auto text-sm font-semibold">{formatMoney(item.product.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-[var(--radius-md)] border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              Cart is always visible. Scan or tap a product to start.
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-semibold">{formatMoney(total)}</span>
          </div>
          <Button
            className="mt-4 h-12 w-full"
            onClick={() => void checkout()}
            disabled={!cart.length || checkingOut}
            loading={checkingOut}
            loadingText="Creating order"
          >
            <ReceiptText size={18} /> Checkout cash
          </Button>
          <Button className="mt-2 w-full print:hidden" variant="secondary" onClick={clearCart} disabled={!cart.length || checkingOut}>
            Clear cart
          </Button>
        </div>
      </aside>
    </div>
  );
}
