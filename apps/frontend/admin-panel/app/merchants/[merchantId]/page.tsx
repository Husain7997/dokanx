"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, CardDescription, CardTitle, DataTable, Grid, Input, SelectDropdown } from "@dokanx/ui";

import { listMerchants, listOrders, listProducts, listSettlements, moderateProduct } from "@/lib/admin-runtime-api";

type MerchantRow = {
  _id?: string;
  name?: string;
  email?: string;
  isBlocked?: boolean;
  shopId?: { _id?: string; name?: string; domain?: string; slug?: string };
};

type OrderRow = {
  _id?: string;
  status?: string;
  disputeStatus?: string;
  totalAmount?: number;
  createdAt?: string;
  shop?: { name?: string };
  user?: { name?: string; email?: string };
};

type ProductRow = {
  _id?: string;
  name?: string;
  price?: number;
  stock?: number;
  shopId?: string;
  moderationStatus?: string;
};

type SettlementRow = {
  _id?: string;
  shopId?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
};

export const dynamic = "force-dynamic";

export default function MerchantDetailPage({ params }: { params: { merchantId: string } }) {
  const merchantId = String(params.merchantId || "");
  const [merchant, setMerchant] = useState<MerchantRow | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [settlements, setSettlements] = useState<SettlementRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [productStatusFilter, setProductStatusFilter] = useState("ALL");
  const [productNoteDraft, setProductNoteDraft] = useState<Record<string, string>>({});
  const [busyProductId, setBusyProductId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [merchantResponse, orderResponse, productResponse, settlementResponse] = await Promise.all([
          listMerchants(),
          listOrders(),
          listProducts(),
          listSettlements(),
        ]);
        if (!active) return;
        const list = Array.isArray(merchantResponse.data) ? (merchantResponse.data as MerchantRow[]) : [];
        const current = list.find((row) => String(row._id || "") === merchantId) || null;
        setMerchant(current);
        setOrders(Array.isArray(orderResponse.data) ? (orderResponse.data as OrderRow[]) : []);
        setProducts(Array.isArray(productResponse.data) ? (productResponse.data as ProductRow[]) : []);
        setSettlements(Array.isArray(settlementResponse.data) ? (settlementResponse.data as SettlementRow[]) : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load merchant detail.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [merchantId]);

  const shopName = merchant?.shopId?.name || merchant?.shopId?.domain || merchant?.shopId?.slug || "";
  const shopId = merchant?.shopId?._id || "";

  const scopedOrders = useMemo(() => {
    if (!shopName) return [];
    return orders.filter((order) => String(order.shop?.name || "").toLowerCase() === shopName.toLowerCase());
  }, [orders, shopName]);

  const scopedProducts = useMemo(() => {
    if (shopId) {
      return products.filter((product) => String(product.shopId || "") === shopId);
    }
    if (shopName) {
      return products.filter((product) => String(product.name || "").toLowerCase().includes(shopName.toLowerCase()));
    }
    return [];
  }, [products, shopId, shopName]);

  const scopedSettlements = useMemo(() => {
    if (!shopId) return [];
    return settlements.filter((settlement) => String(settlement.shopId || "") === shopId);
  }, [settlements, shopId]);

  const revenueTotal = useMemo(
    () => scopedOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    [scopedOrders]
  );

  const disputesCount = useMemo(
    () => scopedOrders.filter((order) => (order.disputeStatus || "NONE") !== "NONE").length,
    [scopedOrders]
  );

  const avgOrderValue = useMemo(
    () => (scopedOrders.length ? revenueTotal / scopedOrders.length : 0),
    [revenueTotal, scopedOrders.length]
  );

  const lowStockCount = useMemo(
    () => scopedProducts.filter((product) => (product.stock ?? 0) <= 5).length,
    [scopedProducts]
  );

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === "ALL") return scopedOrders;
    return scopedOrders.filter((order) => (order.status || "PENDING") === orderStatusFilter);
  }, [orderStatusFilter, scopedOrders]);

  const filteredProducts = useMemo(() => {
    if (productStatusFilter === "ALL") return scopedProducts;
    return scopedProducts.filter((product) => (product.moderationStatus || "PENDING") === productStatusFilter);
  }, [productStatusFilter, scopedProducts]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
          <h1 className="dx-display text-3xl">{merchant?.name || "Merchant"}</h1>
          <p className="text-sm text-muted-foreground">{merchant?.email || "No email"} • {shopName || "No shop"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={merchant?.isBlocked ? "danger" : "success"}>{merchant?.isBlocked ? "Blocked" : "Active"}</Badge>
          <Button asChild variant="secondary" size="sm">
            <a href="/merchants">Back to merchants</a>
          </Button>
          <Button asChild size="sm">
            <a href={`/merchants/${merchantId}/scorecard`}>Open scorecard</a>
          </Button>
        </div>
      </div>

      {error ? (
        <Card>
          <CardTitle>Merchant details</CardTitle>
          <CardDescription className="mt-2">{error}</CardDescription>
        </Card>
      ) : null}

      <Grid minColumnWidth="220px" className="gap-4">
        <Card>
          <CardTitle>Revenue (orders)</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{revenueTotal.toFixed(2)} BDT</p>
          <p className="mt-1 text-xs text-muted-foreground">Based on matched orders</p>
        </Card>
        <Card>
          <CardTitle>Orders</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{scopedOrders.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Orders tied to this store</p>
        </Card>
        <Card>
          <CardTitle>Products</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{scopedProducts.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Catalog items</p>
        </Card>
        <Card>
          <CardTitle>Disputes</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{disputesCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Orders with disputes</p>
        </Card>
        <Card>
          <CardTitle>Avg order value</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{avgOrderValue.toFixed(2)} BDT</p>
          <p className="mt-1 text-xs text-muted-foreground">Average basket size</p>
        </Card>
        <Card>
          <CardTitle>Low stock SKUs</CardTitle>
          <p className="mt-3 text-2xl font-semibold">{lowStockCount}</p>
          <p className="mt-1 text-xs text-muted-foreground">Stock ≤ 5 units</p>
        </Card>
      </Grid>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Store info</CardTitle>
          <CardDescription className="mt-2">Merchant and storefront summary</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap justify-between gap-2">
              <span>Store name</span>
              <span>{merchant?.shopId?.name || "N/A"}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span>Domain</span>
              <span>{merchant?.shopId?.domain || merchant?.shopId?.slug || "N/A"}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span>Merchant ID</span>
              <span>{merchant?._id || "N/A"}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-2">
              <span>Shop ID</span>
              <span>{merchant?.shopId?._id || "N/A"}</span>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle>Settlement history</CardTitle>
          <CardDescription className="mt-2">Latest payout activity</CardDescription>
          <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
            {scopedSettlements.slice(0, 5).map((settlement) => (
              <div key={String(settlement._id)} className="flex flex-wrap justify-between gap-2 rounded-2xl border border-border/60 px-3 py-2">
                <span>{settlement._id ? String(settlement._id).slice(-6) : "Settlement"}</span>
                <span>{settlement.totalAmount ?? 0} BDT</span>
                <Badge variant={settlement.status === "PAID" ? "success" : "neutral"}>{settlement.status || "PENDING"}</Badge>
              </div>
            ))}
            {!scopedSettlements.length ? <p>No settlements available.</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <CardTitle>Orders</CardTitle>
        <CardDescription className="mt-2">Latest orders tied to this merchant</CardDescription>
        <div className="mt-3 flex flex-wrap gap-3">
          <SelectDropdown
            label="Order status"
            options={[
              { label: "All", value: "ALL" },
              { label: "Pending", value: "PENDING" },
              { label: "Confirmed", value: "CONFIRMED" },
              { label: "Packed", value: "PACKED" },
              { label: "Shipped", value: "SHIPPED" },
              { label: "Delivered", value: "DELIVERED" },
              { label: "Cancelled", value: "CANCELLED" },
            ]}
            value={orderStatusFilter}
            onValueChange={setOrderStatusFilter}
          />
        </div>
        <DataTable
          columns={[
            { key: "order", header: "Order" },
            { key: "customer", header: "Customer" },
            { key: "status", header: "Status" },
            { key: "total", header: "Total" },
            { key: "dispute", header: "Dispute" },
            { key: "action", header: "Action" },
          ]}
          rows={filteredOrders.slice(0, 8).map((order) => ({
            id: String(order._id || ""),
            order: order._id ? String(order._id).slice(-6) : "Order",
            customer: order.user?.name || order.user?.email || "Customer",
            status: order.status || "PENDING",
            total: `${order.totalAmount ?? 0} BDT`,
            dispute: order.disputeStatus || "NONE",
            action: order._id ? <a className="text-xs text-primary" href={`/orders?orderId=${order._id}`}>View</a> : "-",
          }))}
        />
        {!filteredOrders.length ? <p className="mt-3 text-sm text-muted-foreground">No orders for this filter.</p> : null}
      </Card>

      <Card>
        <CardTitle>Products</CardTitle>
        <CardDescription className="mt-2">Top products in this store</CardDescription>
        <div className="mt-3 flex flex-wrap gap-3">
          <SelectDropdown
            label="Moderation status"
            options={[
              { label: "All", value: "ALL" },
              { label: "Pending", value: "PENDING" },
              { label: "Approved", value: "APPROVED" },
              { label: "Rejected", value: "REJECTED" },
            ]}
            value={productStatusFilter}
            onValueChange={setProductStatusFilter}
          />
        </div>
        <DataTable
          columns={[
            { key: "product", header: "Product" },
            { key: "price", header: "Price" },
            { key: "stock", header: "Stock" },
            { key: "status", header: "Moderation" },
            { key: "note", header: "Note" },
            { key: "actions", header: "Actions" },
          ]}
          rows={filteredProducts.slice(0, 8).map((product) => ({
            id: String(product._id || ""),
            product: product.name || "Product",
            price: `${product.price ?? 0} BDT`,
            stock: String(product.stock ?? 0),
            status: product.moderationStatus || "PENDING",
            note: (
              <Input
                value={productNoteDraft[product._id || ""] ?? ""}
                onChange={(event) =>
                  setProductNoteDraft((current) => ({
                    ...current,
                    [product._id || ""]: event.target.value,
                  }))
                }
                placeholder="Moderation note"
                className="h-9"
              />
            ),
            actions: (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyProductId === product._id}
                  onClick={async () => {
                    if (!product._id) return;
                    setBusyProductId(product._id);
                    try {
                      await moderateProduct(product._id, {
                        status: "APPROVED",
                        note: productNoteDraft[product._id || ""] || undefined,
                      });
                      const response = await listProducts();
                      setProducts(Array.isArray(response.data) ? (response.data as ProductRow[]) : []);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to approve product.");
                    } finally {
                      setBusyProductId(null);
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyProductId === product._id}
                  onClick={async () => {
                    if (!product._id) return;
                    setBusyProductId(product._id);
                    try {
                      await moderateProduct(product._id, {
                        status: "REJECTED",
                        note: productNoteDraft[product._id || ""] || undefined,
                      });
                      const response = await listProducts();
                      setProducts(Array.isArray(response.data) ? (response.data as ProductRow[]) : []);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Unable to reject product.");
                    } finally {
                      setBusyProductId(null);
                    }
                  }}
                >
                  Reject
                </Button>
              </div>
            ),
          }))}
        />
        {!filteredProducts.length ? (
          <p className="mt-3 text-sm text-muted-foreground">No products associated with this shop yet.</p>
        ) : null}
      </Card>
    </div>
  );
}
