import type { ReactNode } from "react";

export function MobileLayout({
  header,
  footer,
  children
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      {header ? <header className="border-b p-4">{header}</header> : null}
      <main className="flex-1 p-4">{children}</main>
      {footer ? <footer className="border-t p-4">{footer}</footer> : null}
    </div>
  );
}
