import type { ReactNode } from "react";

export function AuthLayout({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="dx-surface w-full max-w-md rounded-[var(--radius-xl)] border p-8 shadow-[var(--shadow-md)]">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
