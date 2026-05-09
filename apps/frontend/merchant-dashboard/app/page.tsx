import Link from "next/link";
import { CheckCircle2, Handshake, PlayCircle, ShieldCheck, Store, WalletCards } from "lucide-react";
import { Button, Card, CardDescription, CardTitle, Logo } from "@dokanx/ui";

const features = [
  { icon: Store, title: "Store command", text: "Products, stock, orders, POS, theme, and delivery in one workspace." },
  { icon: WalletCards, title: "Money safety", text: "KYC-first wallet, payout, payment, and ledger controls for trusted trading." },
  { icon: ShieldCheck, title: "Trust layer", text: "KYC, role access, notifications, audit activity, and verification gates." },
];

export default function MerchantLandingPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl content-center gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="flex flex-col justify-center">
          <Logo variant="full" size="lg" className="max-w-full" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">DokanX Merchant SaaS</p>
          <h1 className="dx-display mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Launch a verified shop, then run sales with confidence.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Register by phone, submit KYC, activate your shop, and manage dashboard, products, POS, storefront, cart, payments, delivery, and customer care from one professional control room.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link href="/register">Register shop</Link></Button>
            <Button asChild size="lg" variant="secondary"><Link href="/login">Login</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/agent">Agent referral</Link></Button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Draft", "KYC Submitted", "Verified Active Shop"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-border bg-card/80 px-3 py-2 text-sm">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid content-center gap-4">
          <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-[#0B1E3C] p-5 text-white shadow-xl">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs">Demo video</span>
                <PlayCircle size={34} />
              </div>
              <div>
                <p className="text-2xl font-semibold">Merchant walkthrough</p>
                <p className="mt-2 max-w-md text-sm text-white/75">Registration, KYC, dashboard, product flow, sticky cart, and POS overview.</p>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="rounded-xl p-4">
                <feature.icon size={22} className="text-primary" />
                <CardTitle className="mt-3 text-base">{feature.title}</CardTitle>
                <CardDescription className="mt-2 text-xs">{feature.text}</CardDescription>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
            <Card className="rounded-xl p-5">
              <CardTitle>Pricing / contract</CardTitle>
              <CardDescription className="mt-2">Starter SaaS contract, verified merchant activation, and agent-assisted onboarding. Payment and withdrawal unlock only after KYC verification.</CardDescription>
            </Card>
            <Card className="rounded-xl p-5">
              <div className="flex items-start gap-3">
                <Handshake size={24} className="text-primary" />
                <div>
                  <CardTitle>Agent referral</CardTitle>
                  <CardDescription className="mt-2">Use agent ID during registration so referral and commission tracking stay clean.</CardDescription>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
