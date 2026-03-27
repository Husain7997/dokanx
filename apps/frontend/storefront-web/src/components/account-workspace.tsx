"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute, useAuth } from "@dokanx/auth";
import { Button, Card, CardDescription, CardTitle, Input } from "@dokanx/ui";

import { createClaim, getCustomerClaims, getCustomerOverview, getMyWallet, getProfile, payCustomerDue, registerCustomer, updatePreferences } from "@/lib/runtime-api";

type FormState = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

type AddressRow = {
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  city: string;
  isDefault?: boolean;
};

type PaymentMethodRow = {
  label: string;
  provider: string;
  accountRef: string;
  isDefault?: boolean;
};

export function AccountWorkspace() {
  const auth = useAuth();
  const [form, setForm] = useState<FormState>({
    name: "Customer Demo",
    email: "customer@dokanx.test",
    phone: "01700000000",
    password: "Password123!",
  });
  const [addresses, setAddresses] = useState<AddressRow[]>([
    {
      label: "Home",
      recipient: "Customer Demo",
      phone: "01700000000",
      line1: "House 12, Road 4",
      city: "Dhaka",
      isDefault: true,
    },
  ]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([
    {
      label: "Primary bKash",
      provider: "BKASH",
      accountRef: "01700000000",
      isDefault: true,
    },
  ]);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [profileSnapshot, setProfileSnapshot] = useState<string | null>(null);
  const [customerOverview, setCustomerOverview] = useState<{
    customer?: { globalCustomerId?: string };
    orders?: Array<Record<string, unknown>>;
    dues?: Array<Record<string, unknown>>;
    payments?: Array<Record<string, unknown>>;
    walletSummary?: {
      totalIncome?: number;
      totalExpense?: number;
      totalDue?: number;
      totalDueSettlements?: number;
    };
  } | null>(null);
  const [claims, setClaims] = useState<Array<Record<string, unknown>>>([]);
  const [walletSnapshot, setWalletSnapshot] = useState<{
    balance?: { cash?: number; credit?: number; bank?: number };
    ledgerSummary?: { totalCredits?: number; totalDebits?: number; totalTransactions?: number };
    lastTransactions?: Array<Record<string, unknown>>;
  } | null>(null);
  const [claimOrderId, setClaimOrderId] = useState("");
  const [claimProductId, setClaimProductId] = useState("");
  const [claimType, setClaimType] = useState<"warranty" | "guarantee">("warranty");
  const [claimReason, setClaimReason] = useState("");

  const sessionDetails = useMemo(
    () => [
      { label: "Status", value: auth.status },
      { label: "Email", value: auth.user?.email || "Not signed in" },
      { label: "Role", value: auth.user?.roleName || "Guest" },
      { label: "Shop", value: auth.user?.shopId || "Not linked" },
    ],
    [auth.status, auth.user],
  );

  useEffect(() => {
    let active = true;

    async function hydrateProfile() {
      if (auth.status !== "authenticated") return;

      try {
        const [response, walletResponse] = await Promise.all([
          getProfile(),
          getMyWallet().catch(() => null),
        ]);
        const user = response.user || null;
        const globalCustomerId =
          typeof user?.globalCustomerId === "string" ? user.globalCustomerId : null;
        if (user && Array.isArray(user.addresses)) {
          setAddresses(
            user.addresses.map((item) => ({
              label: String(item.label || ""),
              recipient: String(item.recipient || ""),
              phone: String(item.phone || ""),
              line1: String(item.line1 || ""),
              city: String(item.city || ""),
              isDefault: Boolean(item.isDefault),
            })),
          );
        }
        if (user && Array.isArray(user.savedPaymentMethods)) {
          setPaymentMethods(
            user.savedPaymentMethods.map((item) => ({
              label: String(item.label || ""),
              provider: String(item.provider || ""),
              accountRef: String(item.accountRef || ""),
              isDefault: Boolean(item.isDefault),
            })),
          );
        }
        if (active) {
          setWalletSnapshot(walletResponse?.data || null);
        }
        if (globalCustomerId) {
          const overview = await getCustomerOverview(globalCustomerId);
          if (active) {
            setCustomerOverview(overview.data || null);
            const claimResponse = await getCustomerClaims(globalCustomerId);
            setClaims(Array.isArray(claimResponse.data) ? claimResponse.data : []);
          }
        }
      } catch {
        // Keep local defaults if profile hydration fails.
      }
    }

    void hydrateProfile();
    return () => {
      active = false;
    };
  }, [auth.status]);

  async function handleLogin() {
    setSubmitting(true);
    setStatus(null);

    try {
      await auth.login({ email: form.email, password: form.password });
      setStatus("Customer session is active.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      setStatus(`${message} Demo credentials stay prefilled so you can retry quickly.`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    setSubmitting(true);
    setStatus(null);

    try {
      await registerCustomer({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
      });
      await auth.login({ email: form.email, password: form.password });
      setStatus("Customer account created and signed in.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register customer.";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshProfile() {
    setSubmitting(true);
    setStatus(null);

    try {
      const [response, walletResponse] = await Promise.all([
        getProfile(),
        getMyWallet().catch(() => null),
      ]);
      const profile = response.user || response.data || null;
      setProfileSnapshot(profile ? JSON.stringify(profile, null, 2) : null);
      const globalCustomerId =
        profile && typeof profile === "object" && "globalCustomerId" in profile
          ? String((profile as { globalCustomerId?: string }).globalCustomerId || "")
          : "";
      if (globalCustomerId) {
        const overview = await getCustomerOverview(globalCustomerId);
        setCustomerOverview(overview.data || null);
        const claimResponse = await getCustomerClaims(globalCustomerId);
        setClaims(Array.isArray(claimResponse.data) ? claimResponse.data : []);
      }
      setWalletSnapshot(walletResponse?.data || null);
      setStatus("Profile sync request completed.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to refresh profile.";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSavePreferences() {
    setSubmitting(true);
    setStatus(null);

    try {
      const response = await updatePreferences({
        addresses,
        savedPaymentMethods: paymentMethods,
      });
      setProfileSnapshot(response.user ? JSON.stringify(response.user, null, 2) : null);
      setStatus(response.message || "Saved addresses and payment methods.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save preferences.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    setSubmitting(true);
    setStatus(null);

    try {
      await auth.logout();
      setProfileSnapshot(null);
      setStatus("You are signed out.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
      <Card>
        <CardTitle>Sign in and manage session</CardTitle>
        <CardDescription className="mt-2">
          Storefront auth, address book, and saved payment methods are now connected to real customer profile endpoints.
        </CardDescription>
        <div className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm">
            <span>Full name</span>
            <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Email</span>
            <Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Phone</span>
            <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <label className="grid gap-2 text-sm">
            <span>Password</span>
            <Input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleRegister} disabled={submitting}>
              {submitting ? "Working..." : "Register Customer"}
            </Button>
            <Button onClick={handleLogin} disabled={submitting}>
              {submitting ? "Working..." : "Sign In"}
            </Button>
            <Button variant="secondary" onClick={handleRefreshProfile} disabled={submitting || auth.status !== "authenticated"}>
              Refresh Profile
            </Button>
            <Button variant="ghost" onClick={handleLogout} disabled={submitting || auth.status !== "authenticated"}>
              Sign Out
            </Button>
          </div>
          {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
        </div>
      </Card>

      <div className="grid gap-6">
        <Card>
          <CardTitle>Session Snapshot</CardTitle>
          <div className="mt-6 grid gap-3">
            {sessionDetails.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ProtectedRoute
        fallback={
          <Card className="lg:col-span-2">
            <CardTitle>Saved profile data</CardTitle>
            <CardDescription className="mt-2">
              Sign in to unlock addresses, order history, and saved payment methods.
            </CardDescription>
          </Card>
        }
      >
        <div className="grid gap-6 lg:col-span-2 lg:grid-cols-2">
          <Card>
            <CardTitle>Address book</CardTitle>
            <div className="mt-6 grid gap-4">
              {addresses.map((address, index) => (
                <div key={`${address.label}-${index}`} className="grid gap-3 rounded-3xl border border-border/60 p-4">
                  <Input value={address.label} onChange={(event) => setAddresses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                  <Input value={address.recipient} onChange={(event) => setAddresses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, recipient: event.target.value } : item))} />
                  <Input value={address.phone} onChange={(event) => setAddresses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item))} />
                  <Input value={address.line1} onChange={(event) => setAddresses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, line1: event.target.value } : item))} />
                  <Input value={address.city} onChange={(event) => setAddresses((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, city: event.target.value } : item))} />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Saved payment methods</CardTitle>
            <div className="mt-6 grid gap-4">
              {paymentMethods.map((method, index) => (
                <div key={`${method.label}-${index}`} className="grid gap-3 rounded-3xl border border-border/60 p-4">
                  <Input value={method.label} onChange={(event) => setPaymentMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                  <Input value={method.provider} onChange={(event) => setPaymentMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, provider: event.target.value } : item))} />
                  <Input value={method.accountRef} onChange={(event) => setPaymentMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, accountRef: event.target.value } : item))} />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button onClick={handleSavePreferences} disabled={submitting}>
                {submitting ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Due dashboard</CardTitle>
            <CardDescription className="mt-2">
              Unified customer due view across the normalized credit ledger.
            </CardDescription>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Total due</span>
                <span className="font-medium">{customerOverview?.walletSummary?.totalDue ?? 0} BDT</span>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Settlements</span>
                <span className="font-medium">{customerOverview?.walletSummary?.totalDueSettlements ?? 0} BDT</span>
              </div>
              <div className="grid gap-2">
                {(customerOverview?.dues || []).slice(0, 5).map((due, index) => (
                  <div key={`${String(due._id || index)}`} className="rounded-2xl border border-border/60 p-3">
                    <p className="text-sm font-medium">Order {String(due.orderId || due._id || "")}</p>
                    <p className="text-xs text-muted-foreground">
                      Outstanding {Number(due.outstandingAmount || 0)} BDT
                    </p>
                    {Number(due.outstandingAmount || 0) > 0 ? (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            setSubmitting(true);
                            setStatus(null);
                            try {
                              await payCustomerDue({
                                creditSaleId: String(due._id || ""),
                                amount: Number(due.outstandingAmount || 0),
                                referenceId: `customer-due-${Date.now()}`,
                                metadata: { source: "storefront-account" },
                              });
                              const globalCustomerId = customerOverview?.customer?.globalCustomerId;
                              if (globalCustomerId) {
                                const overview = await getCustomerOverview(globalCustomerId);
                                setCustomerOverview(overview.data || null);
                              }
                              setStatus("Due payment submitted.");
                            } catch (error) {
                              setStatus(error instanceof Error ? error.message : "Unable to pay due.");
                            } finally {
                              setSubmitting(false);
                            }
                          }}
                          disabled={submitting}
                        >
                          Pay now
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
                {!customerOverview?.dues?.length ? <p className="text-xs text-muted-foreground">No dues found.</p> : null}
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Warranty and guarantee claims</CardTitle>
            <CardDescription className="mt-2">
              Submit a claim against an eligible ordered product and track its status.
            </CardDescription>
            <div className="mt-6 grid gap-3">
              <Input value={claimOrderId} onChange={(event) => setClaimOrderId(event.target.value)} placeholder="Order ID" />
              <Input value={claimProductId} onChange={(event) => setClaimProductId(event.target.value)} placeholder="Product ID" />
              <Input value={claimType} onChange={(event) => setClaimType(event.target.value === "guarantee" ? "guarantee" : "warranty")} placeholder="warranty or guarantee" />
              <Input value={claimReason} onChange={(event) => setClaimReason(event.target.value)} placeholder="Claim reason" />
              <Button
                onClick={async () => {
                  const globalCustomerId = customerOverview?.customer?.globalCustomerId;
                  if (!globalCustomerId || !claimOrderId || !claimProductId || !claimReason) return;
                  setSubmitting(true);
                  setStatus(null);
                  try {
                    await createClaim({
                      orderId: claimOrderId,
                      productId: claimProductId,
                      customerId: globalCustomerId,
                      type: claimType,
                      reason: claimReason,
                    });
                    const claimResponse = await getCustomerClaims(globalCustomerId);
                    setClaims(Array.isArray(claimResponse.data) ? claimResponse.data : []);
                    setStatus("Claim submitted.");
                    setClaimReason("");
                  } catch (error) {
                    setStatus(error instanceof Error ? error.message : "Unable to submit claim.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
              >
                Submit claim
              </Button>
            </div>
            <div className="mt-6 grid gap-3">
              {claims.slice(0, 6).map((claim, index) => (
                <div key={`${String(claim._id || index)}`} className="rounded-2xl border border-border/60 p-4">
                  <p className="text-sm font-medium">
                    {String(claim.type || "claim").toUpperCase()} {String(claim.status || "pending").toUpperCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order {String(claim.orderId || "")} | Product {String(claim.productId || "")}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{String(claim.reason || "")}</p>
                </div>
              ))}
              {!claims.length ? <p className="text-xs text-muted-foreground">No claims submitted.</p> : null}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardTitle>Wallet and grouped deliveries</CardTitle>
            <CardDescription className="mt-2">
              Wallet summary, payment history, and grouped order delivery references for this customer.
            </CardDescription>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Cash balance</p>
                <p className="mt-2 text-lg font-semibold">{walletSnapshot?.balance?.cash ?? 0} BDT</p>
              </div>
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Credit balance</p>
                <p className="mt-2 text-lg font-semibold">{walletSnapshot?.balance?.credit ?? 0} BDT</p>
              </div>
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Bank balance</p>
                <p className="mt-2 text-lg font-semibold">{walletSnapshot?.balance?.bank ?? 0} BDT</p>
              </div>
              <div className="rounded-2xl border border-border/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Transactions</p>
                <p className="mt-2 text-lg font-semibold">{walletSnapshot?.ledgerSummary?.totalTransactions ?? 0}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {(walletSnapshot?.lastTransactions || []).slice(0, 6).map((transaction, index) => (
                <div key={`${String(transaction._id || index)}`} className="rounded-2xl border border-border/60 p-4">
                  <p className="text-sm font-medium">
                    {String(transaction.transactionType || "transaction").toUpperCase()} {Number(transaction.amount || 0)} BDT
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order {String(transaction.orderId || transaction.referenceId || "N/A")} | {String(transaction.walletType || "CASH")}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {String(transaction.note || transaction.direction || "Wallet entry")}
                  </p>
                </div>
              ))}
              {(customerOverview?.orders || []).slice(0, 6).map((order, index) => (
                <div key={`${String(order._id || index)}`} className="rounded-2xl border border-border/60 p-4">
                  <p className="text-sm font-medium">Order {String(order._id || "")}</p>
                  <p className="text-xs text-muted-foreground">
                    Status {String(order.status || "PENDING")} | Delivery group {String(order.deliveryGroupId || "Not grouped")}
                  </p>
                </div>
              ))}
              {!walletSnapshot?.lastTransactions?.length && !customerOverview?.orders?.length ? (
                <p className="text-xs text-muted-foreground">No wallet transactions or orders available.</p>
              ) : null}
            </div>
          </Card>

          {profileSnapshot ? (
            <pre className="overflow-x-auto rounded-2xl border border-border/60 bg-muted/30 p-4 text-xs lg:col-span-2">
              {profileSnapshot}
            </pre>
          ) : null}
        </div>
      </ProtectedRoute>
    </div>
  );
}
