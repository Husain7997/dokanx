import type { ReactNode } from "react";

import { CheckoutSteps } from "../storefront/checkout-steps";

export function CheckoutLayout({
  steps,
  currentStep,
  children,
  aside
}: {
  steps: string[];
  currentStep: number;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-6">
        <CheckoutSteps steps={steps} currentStep={currentStep} />
        {children}
      </div>
      {aside ? <aside>{aside}</aside> : null}
    </div>
  );
}
