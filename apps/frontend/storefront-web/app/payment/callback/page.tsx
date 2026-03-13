import { PaymentCallbackWorkspace } from "@/components/payment-callback-workspace";

export const dynamic = "force-dynamic";

export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;

  return (
    <PaymentCallbackWorkspace
      status={String(query.status || "unknown")}
      orderId={String(query.orderId || "")}
      attemptId={String(query.attemptId || "")}
      providerPaymentId={String(query.providerPaymentId || "")}
      gateway={String(query.gateway || "")}
    />
  );
}
