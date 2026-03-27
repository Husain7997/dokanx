"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";
import type { Cart, Product } from "@dokanx/types";

import { clearCart, getRuntimeCart, saveCart, searchRuntimeProducts } from "@/lib/runtime-api";
import { useCartStore } from "@/stores/cart-store";

type CartWorkspaceProps = {
  initialCart: Cart;
  initialProducts: Product[];
};

type CartProduct = Product & {
  _id?: string;
};

type RuntimeCartItem = Cart["items"][number] & {
  shopId?: string;
};

function buildCart(items: RuntimeCartItem[]): Cart {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    id: "runtime-cart",
    items,
    totals: {
      subtotal,
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      itemCount: items.length,
    },
  };
}

function normalizeRuntimeProducts(products: Product[]): CartProduct[] {
  return products.map((item) => ({
    ...item,
    _id: item._id || item.id,
  }));
}

export function CartWorkspace({ initialCart, initialProducts }: CartWorkspaceProps) {
  const storedCart = useCartStore((state) => state.cart);
  const hydrateShop = useCartStore((state) => state.hydrateShop);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearShop = useCartStore((state) => state.clearShop);
  const [cart, setCart] = useState<Cart>(initialCart);
  const [products, setProducts] = useState<CartProduct[]>(normalizeRuntimeProducts(initialProducts));
  const [selectedProductId, setSelectedProductId] = useState(
    String(initialProducts[0]?._id || initialProducts[0]?.id || ""),
  );
  const [selectedQuantity, setSelectedQuantity] = useState("1");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const activeShopId = useMemo(() => {
    const firstCartItem = cart.items[0] as RuntimeCartItem | undefined;
    return String(firstCartItem?.shopId || products[0]?.shopId || "");
  }, [cart.items, products]);

  const groupedByShop = useMemo(() => {
    const groups = new Map<string, RuntimeCartItem[]>();
    (cart.items as RuntimeCartItem[]).forEach((item) => {
      const key = String(item.shopId || "unscoped");
      const current = groups.get(key) || [];
      current.push(item);
      groups.set(key, current);
    });
    return Array.from(groups.entries()).map(([shopId, items]) => ({
      shopId,
      items,
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }));
  }, [cart.items]);

  useEffect(() => {
    async function hydrateCart() {
      if (!activeShopId) return;

      try {
        const storedItems = storedCart[activeShopId]?.items || [];
        if (storedItems.length) {
          setCart(
            buildCart(
              storedItems.map((item) => ({
                id: `stored-${item.productId}`,
                productId: item.productId,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                shopId: activeShopId,
              }))
            )
          );
        }
        const response = await getRuntimeCart(activeShopId);
        const runtimeCart = response.data;

        if (runtimeCart?.items?.length) {
          const normalizedItems: RuntimeCartItem[] = runtimeCart.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            shopId: activeShopId,
          }));
          hydrateShop(
            activeShopId,
            normalizedItems.map((item) => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            }))
          );
          setCart(buildCart(normalizedItems));
        }
      } catch {
        // Keep server-seeded cart when runtime hydration is unavailable.
      }
    }

    void hydrateCart();
  }, [activeShopId, hydrateShop, storedCart]);

  useEffect(() => {
    async function refreshProducts() {
      try {
        const response = await searchRuntimeProducts({ limit: "8", minStock: "1" });
        if (response.data?.length) {
          const rows = normalizeRuntimeProducts(response.data as Product[]);
          setProducts((current) => {
            const merged = new Map<string, CartProduct>();
            [...current, ...rows].forEach((item) => {
              const key = String(item._id || item.id || "");
              if (key) merged.set(key, item);
            });
            return Array.from(merged.values());
          });
          setSelectedProductId((current) => current || String(rows[0]?._id || rows[0]?.id || ""));
        }
      } catch {
        // Keep server fallback products when runtime search is unavailable.
      }
    }

    void refreshProducts();
  }, []);

  async function persistCart(nextItems: RuntimeCartItem[], successMessage: string) {
    const nextShopId = String(nextItems[0]?.shopId || activeShopId || "");
    if (!nextShopId) {
      setMessage("No shop context available for cart persistence.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await saveCart({
        shopId: nextShopId,
        items: nextItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      const runtimeCart = response.data;
      if (runtimeCart?.items?.length) {
        const normalizedItems: RuntimeCartItem[] = runtimeCart.items.map((item) => ({
          id: item.id,
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          shopId: nextShopId,
        }));
        hydrateShop(
          nextShopId,
          normalizedItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          }))
        );
        setCart(buildCart(normalizedItems));
      } else {
        hydrateShop(
          nextShopId,
          nextItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          }))
        );
        setCart(buildCart(nextItems));
      }

      setMessage(response.message || successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save cart.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem() {
    const selected = products.find((item) => String(item._id || item.id) === selectedProductId);
    const quantity = Math.max(1, Number(selectedQuantity) || 1);

    if (!selected) {
      setMessage("Select a product before adding it to the cart.");
      return;
    }

    const nextItems = [...(cart.items as RuntimeCartItem[])];
    const existing = nextItems.find((item) => item.productId === String(selected._id || selected.id));

    if (existing) {
      existing.quantity += quantity;
      updateQuantity(String(selected.shopId || activeShopId || "unscoped"), existing.productId, existing.quantity);
    } else {
      nextItems.push({
        id: `line-${Date.now()}`,
        productId: String(selected._id || selected.id),
        name: selected.name,
        quantity,
        price: Number(selected.price || 0),
        shopId: selected.shopId,
      });
      addItem(String(selected.shopId || activeShopId || "unscoped"), {
        productId: String(selected._id || selected.id),
        name: selected.name,
        price: Number(selected.price || 0),
        quantity,
      });
    }

    await persistCart(nextItems, `Added ${selected.name} to the cart.`);
  }

  async function handleQuantityChange(productId: string, delta: number) {
    const nextItems = (cart.items as RuntimeCartItem[])
      .map((item) => {
        if (item.productId !== productId) return item;
        updateQuantity(String(item.shopId || activeShopId || "unscoped"), item.productId, item.quantity + delta);
        return {
          ...item,
          quantity: item.quantity + delta,
        };
      })
      .filter((item) => item.quantity > 0);

    await persistCart(nextItems, "Cart quantity updated.");
  }

  async function handleRemove(productId: string) {
    const target = (cart.items as RuntimeCartItem[]).find((item) => item.productId === productId);
    if (target) {
      removeItem(String(target.shopId || activeShopId || "unscoped"), target.productId);
    }
    const nextItems = (cart.items as RuntimeCartItem[]).filter((item) => item.productId !== productId);

    if (!nextItems.length && activeShopId) {
      setLoading(true);
      setMessage(null);
      try {
        await clearCart(activeShopId);
        setCart(buildCart([]));
        clearShop(activeShopId);
        setMessage("Cart cleared.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to remove item.");
      } finally {
        setLoading(false);
      }
      return;
    }

    await persistCart(nextItems, "Item removed from cart.");
  }

  async function handleClearCart() {
    if (!activeShopId) {
      setCart(buildCart([]));
      setMessage("Local cart cleared.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await clearCart(activeShopId);
      setCart(buildCart([]));
      clearShop(activeShopId);
      setMessage("Cart cleared.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to clear cart.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_380px]">
      <Card>
        <CardTitle>Live cart workspace</CardTitle>
        <CardDescription className="mt-2">
          Add products, adjust quantities, remove lines, and persist guest or customer cart state against the backend.
        </CardDescription>
        <div className="mt-6 grid gap-4 border-b border-border/60 pb-6 md:grid-cols-[minmax(0,1fr)_140px_140px]">
          <label className="grid gap-2 text-sm">
            <span>Product</span>
            <select
              className="h-11 rounded-full border border-border bg-background px-4 text-sm"
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
            >
              {products.map((product) => (
                <option key={String(product._id || product.id)} value={String(product._id || product.id)}>
                  {product.name} - {Number(product.price || 0)} BDT
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            <span>Quantity</span>
            <Input value={selectedQuantity} onChange={(event) => setSelectedQuantity(event.target.value)} />
          </label>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleAddItem} disabled={loading || !selectedProductId}>
              {loading ? "Saving..." : "Add To Cart"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          {groupedByShop.length > 1 ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              <p className="font-semibold">Grouped delivery view</p>
              <p className="mt-1 text-muted-foreground">
                {groupedByShop.length} shops → 1 delivery flow once the backend groups eligible routes.
              </p>
            </div>
          ) : null}
          {(cart.items as RuntimeCartItem[]).length ? (
            (cart.items as RuntimeCartItem[]).map((item) => (
              <div key={item.productId} className="rounded-3xl border border-border/60 bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.price} BDT each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => void handleQuantityChange(item.productId, -1)} disabled={loading}>
                      -
                    </Button>
                    <span className="min-w-8 text-center text-sm">{item.quantity}</span>
                    <Button variant="ghost" onClick={() => void handleQuantityChange(item.productId, 1)} disabled={loading}>
                      +
                    </Button>
                    <Button variant="secondary" onClick={() => void handleRemove(item.productId)} disabled={loading}>
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
              Cart is empty. Add one of the live products above to start a persisted cart session.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle>Cart summary</CardTitle>
        <div className="mt-6 grid gap-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Items</span>
            <span>{cart.totals?.itemCount || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Quantity</span>
            <span>{cart.totals?.quantity || 0}</span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold">
            <span>Subtotal</span>
            <span>{cart.totals?.subtotal || 0} BDT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Shops</span>
            <span>{groupedByShop.length}</span>
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          {groupedByShop.map((group) => (
            <div key={group.shopId} className="rounded-2xl border border-border/60 p-3 text-sm">
              <p className="font-medium">Shop {group.shopId === "unscoped" ? "Unknown" : group.shopId.slice(-6)}</p>
              <p className="text-xs text-muted-foreground">{group.items.length} lines • {group.subtotal} BDT</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3">
          <Button asChild>
            <a href="/checkout">Proceed To Checkout</a>
          </Button>
          <Button variant="secondary" onClick={() => void handleClearCart()} disabled={loading}>
            Clear Cart
          </Button>
        </div>
        {message ? (
          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm">
            {message}
          </div>
        ) : null}
        <div className="sticky bottom-4 mt-6">
          <Button asChild className="w-full">
            <a href="/checkout">Checkout {cart.totals?.subtotal || 0} BDT</a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
