import * as Keychain from "react-native-keychain";
import { create } from "zustand";

const MERCHANT_POS_SERVICE = "dokanx.mobile.merchant.pos";

type SplitMode = "CASH" | "ONLINE" | "WALLET" | "CREDIT";

type CartItem = {
  id: string;
  name: string;
  price: number;
  costPrice: number;
  quantity: number;
  manual: boolean;
  discountRate: number;
  barcode?: string;
};

type PosDraft = {
  cart: CartItem[];
  customerId: string;
  customerName: string;
  customerPhone: string;
  globalDiscountRate: string;
  paymentMode: SplitMode;
  splitEnabled: boolean;
  splitAmounts: Record<SplitMode, string>;
};

type MerchantPosState = PosDraft & {
  isHydrated: boolean;
  scannerActive: boolean;
  hydrate: () => Promise<void>;
  setDraft: (patch: Partial<PosDraft>) => Promise<void>;
  setScannerActive: (active: boolean) => void;
  resetDraft: () => Promise<void>;
};

const defaultDraft: PosDraft = {
  cart: [],
  customerId: "",
  customerName: "",
  customerPhone: "",
  globalDiscountRate: "0",
  paymentMode: "CASH",
  splitEnabled: false,
  splitAmounts: { CASH: "", ONLINE: "", WALLET: "", CREDIT: "" },
};

async function persistDraft(draft: PosDraft) {
  await Keychain.setGenericPassword("merchant-pos", JSON.stringify(draft), {
    service: MERCHANT_POS_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

async function readDraft(): Promise<PosDraft> {
  const credentials = await Keychain.getGenericPassword({ service: MERCHANT_POS_SERVICE });
  if (!credentials) {
    return defaultDraft;
  }

  try {
    const parsed = JSON.parse(credentials.password || "{}");
    return {
      cart: Array.isArray(parsed.cart) ? parsed.cart : defaultDraft.cart,
      customerId: typeof parsed.customerId === "string" ? parsed.customerId : defaultDraft.customerId,
      customerName: typeof parsed.customerName === "string" ? parsed.customerName : defaultDraft.customerName,
      customerPhone: typeof parsed.customerPhone === "string" ? parsed.customerPhone : defaultDraft.customerPhone,
      globalDiscountRate: typeof parsed.globalDiscountRate === "string" ? parsed.globalDiscountRate : defaultDraft.globalDiscountRate,
      paymentMode: parsed.paymentMode === "ONLINE" || parsed.paymentMode === "WALLET" || parsed.paymentMode === "CREDIT" ? parsed.paymentMode : "CASH",
      splitEnabled: Boolean(parsed.splitEnabled),
      splitAmounts: {
        CASH: typeof parsed.splitAmounts?.CASH === "string" ? parsed.splitAmounts.CASH : "",
        ONLINE: typeof parsed.splitAmounts?.ONLINE === "string" ? parsed.splitAmounts.ONLINE : "",
        WALLET: typeof parsed.splitAmounts?.WALLET === "string" ? parsed.splitAmounts.WALLET : "",
        CREDIT: typeof parsed.splitAmounts?.CREDIT === "string" ? parsed.splitAmounts.CREDIT : "",
      },
    };
  } catch {
    return defaultDraft;
  }
}

export const useMerchantPosStore = create<MerchantPosState>((set, get) => ({
  ...defaultDraft,
  isHydrated: false,
  scannerActive: false,
  hydrate: async () => {
    try {
      const draft = await readDraft();
      set({ ...draft, isHydrated: true });
    } catch {
      set({ ...defaultDraft, isHydrated: true });
    }
  },
  setDraft: async (patch) => {
    const next = {
      cart: patch.cart ?? get().cart,
      customerId: patch.customerId ?? get().customerId,
      customerName: patch.customerName ?? get().customerName,
      customerPhone: patch.customerPhone ?? get().customerPhone,
      globalDiscountRate: patch.globalDiscountRate ?? get().globalDiscountRate,
      paymentMode: patch.paymentMode ?? get().paymentMode,
      splitEnabled: patch.splitEnabled ?? get().splitEnabled,
      splitAmounts: patch.splitAmounts ?? get().splitAmounts,
    };
    set(next);
    await persistDraft(next);
  },
  setScannerActive: (active) => set({ scannerActive: active }),
  resetDraft: async () => {
    set({ ...defaultDraft, scannerActive: false });
    await persistDraft(defaultDraft);
  },
}));
