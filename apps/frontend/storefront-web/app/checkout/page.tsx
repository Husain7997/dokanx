import { Card, CardDescription, CardTitle, CheckoutLayout } from "@dokanx/ui";

export default function CheckoutPage() {
  return (
    <CheckoutLayout
      steps={["Address", "Delivery", "Payment", "Review"]}
      currentStep={1}
      aside={
        <Card>
          <CardTitle>Order Summary</CardTitle>
          <CardDescription className="mt-2">
            Checkout integration is ready for payment and ledger flows.
          </CardDescription>
        </Card>
      }
    >
      <Card>
        <CardTitle>Checkout Flow</CardTitle>
        <CardDescription className="mt-2">
          The checkout route is prepared for authenticated order creation and payment initiation.
        </CardDescription>
      </Card>
    </CheckoutLayout>
  );
}
