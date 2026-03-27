import { Linking } from "react-native";

import { initiatePaymentRequest } from "./api-client";

type StartPaymentFlowInput = {
  accessToken: string;
  orderId: string;
  provider: string;
};

export async function startOnlinePaymentFlow({
  accessToken,
  orderId,
  provider,
}: StartPaymentFlowInput) {
  const response = await initiatePaymentRequest(accessToken, orderId, { provider });

  if (!response.paymentUrl) {
    throw new Error(response.message || "Payment link unavailable. Please try again.");
  }

  const supported = await Linking.canOpenURL(response.paymentUrl);
  if (!supported) {
    throw new Error("Payment app or browser is unavailable on this device.");
  }

  await Linking.openURL(response.paymentUrl);

  return {
    paymentUrl: response.paymentUrl,
    provider: response.provider || response.gateway || provider,
    message: response.message || null,
  };
}
