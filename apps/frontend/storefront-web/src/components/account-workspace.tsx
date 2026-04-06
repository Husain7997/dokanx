"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedRoute, useAuth } from "@dokanx/auth";
import { Alert, AnalyticsCards, Badge, Button, Card, CardDescription, CardTitle, Input, Logo } from "@dokanx/ui";

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

  const overviewStats = useMemo(
    () => [
      { label: "Wallet balance", value: `${walletSnapshot?.balance?.cash ?? 0} BDT`, meta: "Cash wallet" },
      { label: "Open due", value: `${customerOverview?.walletSummary?.totalDue ?? 0} BDT`, meta: "Across credit purchases" },
      { label: "Orders", value: String(customerOverview?.orders?.length || 0), meta: "Known customer orders" },
      { label: "Claims", value: String(claims.length), meta: "Warranty and guarantee history" },
      { label: "Transactions", value: String(walletSnapshot?.ledgerSummary?.totalTransactions ?? 0), meta: "Ledger entries" },
      { label: "Saved addresses", value: String(addresses.length), meta: "Checkout-ready destinations" },
      { label: "Saved payments", value: String(paymentMethods.length), meta: "Preferred payment methods" },
      { label: "Due settlements", value: `${customerOverview?.walletSummary?.totalDueSettlements ?? 0} BDT`, meta: "Already paid back" },
    ],
    [addresses.length, claims.length, customerOverview?.orders?.length, customerOverview?.walletSummary?.totalDue, customerOverview?.walletSummary?.totalDueSettlements, paymentMethods.length, walletSnapshot?.balance?.cash, walletSnapshot?.ledgerSummary?.totalTransactions],
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
    <div className="grid gap-6">
      <Card className="overflow-hidden border-border/70 bg-card/92">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Logo variant="full" size="lg" className="max-w-full" />
                <p className="mt-4 text-xs uppercase tracking-[0.28em] text-muted-foreground">Customer account</p>
              </div>
              <div className="rounded-3xl border border-border/70 bg-[linear-gradient(135deg,rgba(255,122,0,0.12),rgba(255,165,0,0.18))] p-2">
                <Logo variant="icon" size="md" />
              </div>
            </div>
            <h1 className="mt-6 text-3xl font-semibold text-foreground">One place for sign-in, wallet, dues, and support claims.</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">This account workspace keeps customer identity, saved preferences, due repayment, and support follow-up inside one consistent flow.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session</p>
                <p className="mt-2 font-medium text-foreground">Sign in or register fast</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Finance</p>
                <p className="mt-2 font-medium text-foreground">Wallet and due visibility</p>
              </div>
              <div className="rounded-2xl border border-border/50 bg-background/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Support</p>
                <p className="mt-2 font-medium text-foreground">Claims stay traceable</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border/60 bg-background/70 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Session snapshot</p>
            <div className="mt-4 grid gap-3">
              {sessionDetails.map((row) => (
                <div key={row.label} className="rounded-2xl border border-border/60 bg-card/90 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="text-sm font-medium text-foreground">{row.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <AnalyticsCards items={overviewStats} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card>
          <CardTitle>Sign in and manage session</CardTitle>
          <CardDescription className="mt-2">Storefront auth, address book, and saved payment methods are connected to live customer profile endpoints.</CardDescription>
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
                {submitting ? "Working..." : "Register customer"}
              </Button>
              <Button onClick={handleLogin} disabled={submitting}>
                {submitting ? "Working..." : "Sign in"}
              </Button>
              <Button variant="secondary" onClick={handleRefreshProfile} disabled={submitting || auth.status !== "authenticated"}>
                Refresh profile
              </Button>
              <Button variant="ghost" onClick={handleLogout} disabled={submitting || auth.status !== "authenticated"}>
                Sign out
              </Button>
            </div>
            {status ? <Alert variant="info">{status}</Alert> : null}
          </div>
        </Card>

        <Card>
          <CardTitle>Quick guidance</CardTitle>
          <CardDescription className="mt-2">A short map of what becomes available after authentication.</CardDescription>
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="font-medium text-foreground">Profile sync</p>
              <p className="mt-1 text-xs">Fetch live addresses, wallet balances, dues, and claim history after sign-in.</p>
            </div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="font-medium text-foreground">Preferences</p>
              <p className="mt-1 text-xs">Saved addresses and payment methods can be edited before checkout.</p>
            </div>
            <div className="rounded-2xl border border-border/60 px-4 py-3">
              <p className="font-medium text-foreground">Support and credit</p>
              <p className="mt-1 text-xs">Customers can repay due balances and raise warranty or guarantee claims here.</p>
            </div>
          </div>
        </Card>
      </div>

      <ProtectedRoute
        fallback={
          <Card>
            <CardTitle>Saved profile data</CardTitle>
            <CardDescription className="mt-2">
              Sign in to unlock addresses, order history, wallet detail, and saved payment methods.
            </CardDescription>
          </Card>
        }
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardTitle>Address book</CardTitle>
            <div className="mt-6 grid gap-4">
              {addresses.map((address, index) => (
                <div key={`${address.label}-${index}`} className="grid gap-3 rounded-3xl border border-border/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{address.label || `Address ${index + 1}`}</p>
                    {address.isDefault ? <Badge variant="success">Default</Badge> : null}
                  </div>
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
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{method.label || `Method ${index + 1}`}</p>
                    {method.isDefault ? <Badge variant="success">Default</Badge> : null}
                  </div>
                  <Input value={method.label} onChange={(event) => setPaymentMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                  <Input value={method.provider} onChange={(event) => setPaymentMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, provider: event.target.value } : item))} />
                  <Input value={method.accountRef} onChange={(event) => setPaymentMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, accountRef: event.target.value } : item))} />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button onClick={handleSavePreferences} disabled={submitting}>
                {submitting ? "Saving..." : "Save preferences"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardTitle>Due dashboard</CardTitle>
            <CardDescription className="mt-2">Unified customer due view across the normalized credit ledger.</CardDescription>
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
                    <p className="text-xs text-muted-foreground">Outstanding {Number(due.outstandingAmount || 0)} BDT</p>
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
                              setStatus("Due payment submitted and queued for confirmation.");
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
                {!customerOverview?.dues?.length ? <p className="text-xs text-muted-foreground">No active dues right now. Future credit balances will appear here.</p> : null}
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Warranty and guarantee claims</CardTitle>
            <CardDescription className="mt-2">Submit a claim against an eligible ordered product and track its status.</CardDescription>
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
                    setStatus("Claim submitted and added to your account history.");
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
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{String(claim.type || "claim").toUpperCase()}</p>
                    <Badge variant={String(claim.status || "pending").toUpperCase() === "RESOLVED" ? "success" : "warning"}>{String(claim.status || "pending").toUpperCase()}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Order {String(claim.orderId || "")} | Product {String(claim.productId || "")}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{String(claim.reason || "")}</p>
                </div>
              ))}
              {!claims.length ? <p className="text-xs text-muted-foreground">No claims have been submitted yet.</p> : null}
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <CardTitle>Wallet and grouped deliveries</CardTitle>
            <CardDescription className="mt-2">Wallet summary, payment history, and grouped order delivery references for this customer.</CardDescription>
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
                  <p className="text-sm font-medium">{String(transaction.transactionType || "transaction").toUpperCase()} {Number(transaction.amount || 0)} BDT</p>
                  <p className="text-xs text-muted-foreground">Order {String(transaction.orderId || transaction.referenceId || "N/A")} | {String(transaction.walletType || "CASH")}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{String(transaction.note || transaction.direction || "Wallet entry")}</p>
                </div>
              ))}
              {(customerOverview?.orders || []).slice(0, 6).map((order, index) => (
                <div key={`${String(order._id || index)}`} className="rounded-2xl border border-border/60 p-4">
                  <p className="text-sm font-medium">Order {String(order._id || "")}</p>
                  <p className="text-xs text-muted-foreground">Status {String(order.status || "PENDING")} | Delivery group {String(order.deliveryGroupId || "Not grouped")}</p>
                </div>
              ))}
              {!walletSnapshot?.lastTransactions?.length && !customerOverview?.orders?.length ? (
                <p className="text-xs text-muted-foreground">Wallet activity and recent orders will appear here after the first checkout, repayment, or top-up.</p>
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


