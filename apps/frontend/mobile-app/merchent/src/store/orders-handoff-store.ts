import { create } from "zustand";

type MerchantOrdersHandoffState = {
  preferOnlineTab: boolean;
  preferFollowUpOnly: boolean;
  requestedOrderId: string | null;
  lastReviewedOrderId: string | null;
  setPosFollowUpHandoff: (orderId?: string | null) => void;
  markOrderReviewed: (orderId: string) => void;
  clearHandoff: () => void;
};

export const useMerchantOrdersHandoffStore = create<MerchantOrdersHandoffState>((set) => ({
  preferOnlineTab: false,
  preferFollowUpOnly: false,
  requestedOrderId: null,
  lastReviewedOrderId: null,
  setPosFollowUpHandoff: (orderId) =>
    set({
      preferOnlineTab: true,
      preferFollowUpOnly: true,
      requestedOrderId: orderId ? String(orderId) : null,
    }),
  markOrderReviewed: (orderId) =>
    set({
      lastReviewedOrderId: String(orderId || ""),
      requestedOrderId: String(orderId || ""),
    }),
  clearHandoff: () =>
    set({
      preferOnlineTab: false,
      preferFollowUpOnly: false,
      requestedOrderId: null,
    }),
}));

