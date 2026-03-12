import type { ReactNode } from "react";

import { Card } from "../ui/card";

export function FilterBar({
  children,
  actions
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-1 flex-wrap gap-3">{children}</div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </Card>
  );
}
