import { apiRequest, registerUnauthorizedHandler } from "../../../shared/api-client";
import { getApiBaseUrl } from "../../../shared/api-config";

const MERCHANT_APP_VERSION = "1.0.0";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown> | null;
  token?: string | null;
  tenantId?: string | null;
};

type MerchantOrderRow = {
  _id?: string;
  status?: string;
  totalAmount?: number;
  createdAt?: string;
  paymentMode?: string;
  paymentStatus?: string;
  contact?: { phone?: string; email?: string };
  user?: { name?: string; email?: string; phone?: string };
  items?: Array<{
    quantity?: number;
    price?: number;
    product?: { _id?: string; name?: string };
  }>;
};

function request<T>(path: string, options: RequestOptions = {}) {
  return apiRequest<T>(getApiBaseUrl(MERCHANT_APP_VERSION), path, options);
}

export async function probeMerchantLoginEndpoint() {
  const baseUrl = getApiBaseUrl(MERCHANT_APP_VERSION);
  const target = `${baseUrl}/api/auth/login`;

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "",
        password: "",
      }),
    });

    return {
      ok: true,
      status: response.status,
      url: target,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Merchant login endpoint unreachable";
    return {
      ok: false,
      status: null,
      url: target,
      message: `Unable to reach ${target}: ${message}`,
    };
  }
}

export { getApiBaseUrl, registerUnauthorizedHandler };

export function merchantLoginRequest(payload: { email: string; password: string }) {
  return request<{ token?: string; accessToken?: string }>("/api/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getMerchantProfileRequest(token: string) {
  return request<{
    user?: {
      _id?: string;
      name?: string;
      email?: string;
      role?: string;
      phone?: string;
      shopId?: string;
    };
  }>("/api/me", { token });
}

export function getMerchantOrdersRequest(token: string) {
  return request<{ data?: MerchantOrderRow[] }>("/api/orders/my", { token });
}

export function updateMerchantOrderStatusRequest(token: string, orderId: string, status: string) {
  return request<{
    message?: string;
    order?: MerchantOrderRow;
    data?: MerchantOrderRow;
  }>(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export function getMerchantWalletSummaryRequest(token: string) {
  return request<{
    data?: {
      balance?: number;
      updatedAt?: string;
      available_balance?: number;
      balances?: { cash?: number; credit?: number };
    };
  }>("/api/wallet/me", { token });
}

export function getMerchantWalletLedgerRequest(token: string, options: { limit?: number; type?: string; dateFrom?: string; dateTo?: string } = {}) {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit || 20));
  if (options.type && options.type !== "ALL") params.set("type", options.type);
  if (options.dateFrom) params.set("dateFrom", options.dateFrom);
  if (options.dateTo) params.set("dateTo", options.dateTo);
  return request<{
    data?: Array<{
      _id?: string;
      amount?: number;
      type?: string;
      walletType?: string;
      referenceId?: string;
      reference?: string;
      createdAt?: string;
      meta?: Record<string, unknown>;
    }>;
  }>(`/api/shop/wallet/ledger?${params.toString()}`, { token });
}

export function getMerchantCustomersRequest(token: string) {
  return request<{
    data?: Array<{
      _id?: string;
      globalCustomerId?: string;
      name?: string;
      email?: string;
      phone?: string;
      orderCount?: number;
      totalSpend?: number;
      totalDue?: number;
      createdAt?: string;
      isBlocked?: boolean;
    }>;
  }>("/api/shops/me/customers", { token });
}

export function searchMerchantCustomersRequest(token: string, query: string) {
  return request<{
    data?: Array<{
      _id?: string;
      globalCustomerId?: string;
      name?: string;
      email?: string;
      phone?: string;
      orderCount?: number;
      totalSpend?: number;
      totalDue?: number;
      createdAt?: string;
      isBlocked?: boolean;
    }>;
  }>(`/api/shops/me/customers?q=${encodeURIComponent(query)}`, { token });
}

export type MerchantProductApiRow = {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  costPrice?: number;
  discountRate?: number;
  stock?: number;
  category?: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  productionDate?: string;
  expiryDate?: string;
};


export function createMerchantCustomerRequest(token: string, payload: {
  name?: string;
  phone: string;
  email?: string;
}) {
  return request<{
    data?: {
      _id?: string;
      name?: string;
      email?: string;
      phone?: string;
      globalCustomerId?: string;
    };
  }>("/api/shops/me/customers", {
    method: "POST",
    token,
    body: payload,
  });
}
export function getMerchantProductsRequest(shopId: string) {
  return request<{ data?: MerchantProductApiRow[] }>(`/api/products/shop/${encodeURIComponent(shopId)}`);
}

export function searchMerchantProductsRequest(shopId: string, query: string) {
  return request<{ data?: MerchantProductApiRow[] }>(`/api/products/shop/${encodeURIComponent(shopId)}?q=${encodeURIComponent(query)}`);
}

export function searchMerchantProductsAISuggestionsRequest(query: string) {
  return request<{ data?: Array<{ id: string; name: string; entityType: string }> }>(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
}

export function getMerchantProductByBarcodeRequest(shopId: string, barcode: string) {
  return request<{ data?: MerchantProductApiRow }>(`/api/products/barcode/${encodeURIComponent(barcode)}?shopId=${encodeURIComponent(shopId)}`);
}

export function createMerchantProductRequest(token: string, payload: {
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  barcode?: string;
  imageUrl?: string;
  productionDate?: string;
  expiryDate?: string;
  discountRate?: number;
}) {
  return request<{ data?: { _id?: string; name?: string } }>("/api/products", {
    method: "POST",
    token,
    body: payload,
  });
}

export function createMerchantProductsBulkRequest(token: string, rows: Array<{
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  barcode?: string;
  imageUrl?: string;
  productionDate?: string;
  expiryDate?: string;
  discountRate?: number;
}>) {
  return request<{
    success?: boolean;
    createdCount?: number;
    failedCount?: number;
    data?: Array<{ _id?: string; name?: string }>;
    errors?: Array<{ index?: number; name?: string; message?: string }>;
  }>("/api/products/bulk", {
    method: "POST",
    token,
    body: { rows },
  });
}

export function updateMerchantProductRequest(token: string, productId: string, payload: {
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  stock: number;
  barcode?: string;
  imageUrl?: string;
  productionDate?: string;
  expiryDate?: string;
  discountRate?: number;
}) {
  return request<{ data?: { _id?: string; name?: string } }>(`/api/products/${productId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export function deleteMerchantProductRequest(token: string, productId: string) {
  return request<{ message?: string }>(`/api/products/${productId}`, {
    method: "DELETE",
    token,
  });
}

export function getMerchantCreditCustomersRequest(token: string) {
  return request<{
    data?: Array<{
      customerId?: string;
      outstandingBalance?: number;
      creditLimit?: number;
      availableCredit?: number;
      status?: string;
      paymentHistory?: Array<{
        _id?: string;
        type?: string;
        amount?: number;
        status?: string;
        reference?: string;
        createdAt?: string;
      }>;
    }>;
  }>("/api/credit/me", { token });
}

export function createMerchantCreditSaleRequest(token: string, payload: {
  orderId: string;
  customerId: string;
  amount: number;
}) {
  return request<{ data?: { _id?: string; outstandingAmount?: number; status?: string } }>("/api/credit/sales", {
    method: "POST",
    token,
    body: payload,
  });
}

export function payMerchantCreditDueRequest(token: string, payload: {
  creditSaleId?: string;
  customerId?: string;
  amount: number;
  referenceId: string;
  paymentMode: "WALLET" | "ONLINE";
  metadata?: Record<string, unknown>;
}) {
  return request<{ data?: { _id?: string; status?: string; outstandingAmount?: number; payments?: unknown[] } }>("/api/credit/payments", {
    method: "POST",
    token,
    body: payload,
  });
}

export function openMerchantPosSessionRequest(token: string, payload: { openingBalance?: number }) {
  return request<{ data?: { _id?: string; status?: string; openingBalance?: number; openedAt?: string } }>("/api/pos/sessions", {
    method: "POST",
    token,
    body: payload,
  });
}

export function closeMerchantPosSessionRequest(token: string, sessionId: string, payload: { closingBalance?: number }) {
  return request<{ data?: { _id?: string; status?: string; closingBalance?: number; closedAt?: string } }>(`/api/pos/sessions/${sessionId}/close`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function createMerchantPosOrderRequest(token: string, payload: {
  customerId?: string;
  sessionId?: string;
  paymentMode?: "CASH" | "ONLINE" | "WALLET" | "CREDIT";
  paymentBreakdown?: Array<{ mode: "CASH" | "ONLINE" | "WALLET" | "CREDIT"; amount: number }>;
  items: Array<{ product?: string; name?: string; quantity: number; price?: number }>;
}) {
  return request<{ data?: { _id?: string; totalAmount?: number; status?: string; paymentStatus?: string } }>("/api/pos/orders", {
    method: "POST",
    token,
    body: payload,
  });
}

export function initiateMerchantPaymentRequest(token: string, orderId: string, provider = "bkash") {
  return request<{
    message?: string;
    data?: {
      orderId?: string;
      paymentUrl?: string;
      gateway?: string;
      provider?: string;
      status?: string;
      paymentId?: string;
    };
    paymentUrl?: string;
  }>(`/api/payments/initiate/${orderId}`, {
    method: "POST",
    token,
    body: { provider },
  });
}

export type MerchantFeatureSettings = {
  posScannerEnabled?: boolean;
  cameraScannerEnabled?: boolean;
  bluetoothScannerEnabled?: boolean;
  scannerFeedbackEnabled?: boolean;
  productSearchEnabled?: boolean;
  discountToolsEnabled?: boolean;
  pricingSafetyEnabled?: boolean;
  splitPaymentEnabled?: boolean;
};

export type MerchantPricingSafetySettings = {
  greenMinMarginPct?: number;
  limeMinMarginPct?: number;
  yellowMinMarginPct?: number;
  orangeMinMarginPct?: number;
  redBelowCost?: boolean;
};

export function getMerchantShopSettingsRequest(token: string) {
  return request<{
    data?: {
      name?: string;
      supportEmail?: string;
      whatsapp?: string;
      payoutSchedule?: string;
      settlementFrequency?: string;
      settlementDelayDays?: number;
      settlementNotes?: string;
      settlementBankName?: string;
      settlementAccountName?: string;
      settlementAccountNumber?: string;
      settlementRoutingNumber?: string;
      settlementBranchName?: string;
      preferredBankGateway?: string;
      storefrontDomain?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      country?: string;
      merchantFeatures?: MerchantFeatureSettings;
      pricingSafety?: MerchantPricingSafetySettings;
      kyc?: {
        status?: string;
        submittedAt?: string | null;
        approvedAt?: string | null;
        rejectedAt?: string | null;
        rejectionReason?: string;
        profilePhotoUrl?: string;
        nationalIdNumber?: string;
        nationalIdFrontUrl?: string;
        nationalIdBackUrl?: string;
        tradeLicenseNumber?: string;
        tradeLicenseUrl?: string;
      };
    };
  }>("/api/shops/me/settings", { token });
}

export function updateMerchantShopSettingsRequest(token: string, payload: {
  name: string;
  supportEmail: string;
  whatsapp: string;
  payoutSchedule: string;
  settlementFrequency?: string;
  settlementDelayDays?: number;
  settlementNotes?: string;
  settlementBankName?: string;
  settlementAccountName?: string;
  settlementAccountNumber?: string;
  settlementRoutingNumber?: string;
  settlementBranchName?: string;
  preferredBankGateway?: string;
  storefrontDomain?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  merchantFeatures?: MerchantFeatureSettings;
  pricingSafety?: MerchantPricingSafetySettings;
  kyc?: {
    profilePhotoUrl?: string;
    nationalIdNumber?: string;
    nationalIdFrontUrl?: string;
    nationalIdBackUrl?: string;
    tradeLicenseNumber?: string;
    tradeLicenseUrl?: string;
    submit?: boolean;
  };
}) {
  return request<{ data?: Record<string, unknown> }>("/api/shops/me/settings", {
    method: "PUT",
    token,
    body: payload,
  });
}

export function listMerchantNotificationsRequest(token: string) {
  return request<{
    data?: Array<{
      _id?: string;
      title?: string;
      message?: string;
      type?: string;
      isRead?: boolean;
      createdAt?: string;
    }>;
  }>("/api/notifications", { token });
}

export function markMerchantNotificationReadRequest(token: string, notificationId: string) {
  return request<{ data?: Record<string, unknown> }>(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    token,
  });
}

export function markAllMerchantNotificationsReadRequest(token: string) {
  return request<{ updated?: number }>("/api/notifications/read-all", {
    method: "PATCH",
    token,
  });
}

export function getMerchantNotificationSettingsRequest(token: string) {
  return request<{
    data?: {
      channels?: Record<string, boolean>;
      categories?: Record<string, boolean>;
    };
  }>("/api/notifications/settings", { token });
}

export function updateMerchantNotificationSettingsRequest(token: string, payload: {
  channels?: Record<string, boolean>;
  categories?: Record<string, boolean>;
}) {
  return request<{
    data?: {
      channels?: Record<string, boolean>;
      categories?: Record<string, boolean>;
    };
  }>("/api/notifications/settings", {
    method: "PUT",
    token,
    body: payload,
  });
}

export function topupMerchantWalletRequest(token: string, payload: { amount: number; referenceId?: string; reference?: string }) {
  return request<{ data?: Record<string, unknown>; message?: string }>("/api/wallet/credit", {
    method: "POST",
    token,
    body: payload,
  });
}

export function blockMerchantCustomerRequest(token: string, userId: string) {
  return request<{ data?: { _id?: string; isBlocked?: boolean }; message?: string }>(`/api/shops/me/customers/${userId}/block`, {
    method: "PATCH",
    token,
  });
}

export function unblockMerchantCustomerRequest(token: string, userId: string) {
  return request<{ data?: { _id?: string; isBlocked?: boolean }; message?: string }>(`/api/shops/me/customers/${userId}/unblock`, {
    method: "PATCH",
    token,
  });
}

export function listMerchantCustomerComplaintsRequest(token: string) {
  return request<{ data?: Array<{ _id?: string; customerId?: string; globalCustomerId?: string; title?: string; detail?: string; channel?: string; status?: string; createdAt?: string }> }>("/api/shops/me/customer-complaints", { token });
}

export function createMerchantCustomerComplaintRequest(token: string, payload: { customerId: string; globalCustomerId?: string; title: string; detail?: string; channel?: string }) {
  return request<{ data?: Record<string, unknown> }>("/api/shops/me/customer-complaints", {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateMerchantCustomerComplaintRequest(token: string, complaintId: string, payload: { status?: string; detail?: string }) {
  return request<{ data?: Record<string, unknown> }>(`/api/shops/me/customer-complaints/${complaintId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

export type MerchantCampaignApiRow = { _id?: string; name?: string; type?: string; status?: string; platform?: string; channel?: string; content?: string; offerTitle?: string; ctaLabel?: string; redirectUrl?: string; trackingCode?: string; targetingSummary?: string; autoMessage?: string; createdAt?: string; scheduleAt?: string; };

export function listMerchantCampaignsRequest(token: string) {
  return request<{ data?: MerchantCampaignApiRow[] }>("/api/marketing/campaigns", { token });
}

export function createMerchantCampaignRequest(token: string, payload: { name: string; type?: string; status?: string; platform?: string; channel?: string; content?: string; offerTitle?: string; ctaLabel?: string; redirectUrl?: string; trackingCode?: string; targetingSummary?: string; autoMessage?: string }) {
  return request<{ data?: Record<string, unknown> }>("/api/marketing/campaigns", {
    method: "POST",
    token,
    body: payload,
  });
}

export function getMerchantPrintCodesRequest(token: string, options: { data?: string; barcode?: string; size?: number }) {
  const params = new URLSearchParams();
  if (options.data) params.set("data", options.data);
  if (options.barcode) params.set("barcode", options.barcode);
  if (options.size) params.set("size", String(options.size));
  return request<{ data?: { qrDataUrl?: string; barcodeDataUrl?: string; target?: string; barcode?: string } }>(`/api/shops/me/print-codes?${params.toString()}`, { token });
}

export function getMerchantAiInsightsRequest(token: string) {
  return request<{
    data?: Array<{
      id?: string;
      title?: string;
      message?: string;
      badge?: string;
    }>;
  }>("/api/ai/merchant-insights", { token });
}

export function getMerchantDemandForecastRequest(token: string, range: "7" | "30" = "30") {
  return request<{
    data?: {
      labels?: string[];
      actual?: number[];
      forecast?: number[];
    };
  }>(`/api/ai/demand-forecast?range=${range}`, { token });
}

export function getMerchantPricingInsightsRequest(token: string) {
  return request<{
    data?: Array<{
      product?: string;
      marketPrice?: number;
      yourPrice?: number;
      suggestion?: number;
      inventory?: number;
      velocity?: string;
      competitor?: string;
    }>;
  }>("/api/ai/pricing-insights", { token });
}

export function recordMerchantAiFeedbackRequest(token: string, payload: {
  eventType: "click" | "purchase" | "ignore";
  context: string;
  metadata?: Record<string, unknown>;
  productId?: string;
  shopId?: string;
}) {
  return request<{ data?: Record<string, unknown> }>("/api/ai/feedback", {
    method: "POST",
    token,
    body: payload,
  });
}

export function getMerchantFinanceOverviewRequest(token: string) {
  return request<{
    data?: {
      shop?: { id?: string; name?: string; vatRate?: number };
      accounting?: {
        businessIncome?: number;
        businessExpense?: number;
        businessProfit?: number;
        personalIncome?: number;
        personalExpense?: number;
        personalNet?: number;
      };
      tax?: {
        taxableSales?: number;
        deductibleExpense?: number;
        estimatedVatDue?: number;
        estimatedNetProfit?: number;
      };
      fraud?: {
        totalCases?: number;
        openCases?: number;
        highRiskCases?: number;
        alerts?: Array<{
          id?: string;
          level?: string;
          status?: string;
          summary?: string;
          updatedAt?: string;
        }>;
      };
      entries?: Array<{
        id?: string;
        amount?: number;
        transactionType?: string;
        walletType?: string;
        referenceId?: string;
        createdAt?: string;
        scope?: string;
        category?: string;
        note?: string;
      }>;
    };
  }>("/api/finance/me", { token });
}

export function createMerchantFinanceEntryRequest(token: string, payload: {
  amount: number;
  transactionType: "income" | "expense" | "transfer" | "cheque";
  scope: "BUSINESS" | "PERSONAL";
  category: string;
  note?: string;
  walletType?: "CASH" | "BANK" | "CREDIT";
}) {
  return request<{ data?: Record<string, unknown> }>("/api/finance/me/entries", {
    method: "POST",
    token,
    body: payload,
  });
}


export type MerchantTeamMember = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  permissionOverrides?: string[];
};

export type MerchantTeamActivityEntry = {
  id?: string;
  action?: string;
  actorName?: string;
  actorRole?: string;
  createdAt?: string;
  targetType?: string;
};

export function listMerchantTeamMembersRequest(token: string) {
  return request<{ data?: MerchantTeamMember[] }>("/api/shops/me/team", { token });
}

export function listMerchantTeamActivityRequest(token: string) {
  return request<{ data?: MerchantTeamActivityEntry[] }>("/api/shops/me/team/activity", { token });
}

export function addMerchantTeamMemberRequest(token: string, payload: {
  name?: string;
  email: string;
  phone?: string;
  role?: string;
  permissions?: string[];
}) {
  return request<{
    message?: string;
    invite?: { inviteUrl?: string; expiresAt?: string; emailSent?: boolean };
    data?: MerchantTeamMember;
  }>("/api/shops/me/team", { method: "POST", token, body: payload });
}

export function updateMerchantTeamMemberRequest(token: string, userId: string, payload: {
  role?: string;
  permissions?: string[];
  resendInvite?: boolean;
}) {
  return request<{
    message?: string;
    invite?: { inviteUrl?: string; expiresAt?: string; emailSent?: boolean };
    data?: MerchantTeamMember;
  }>(`/api/shops/me/team/${userId}`, { method: "PATCH", token, body: payload });
}










