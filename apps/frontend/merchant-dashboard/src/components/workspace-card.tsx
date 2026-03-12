"use client";

import type { ReactNode } from "react";
import { Card, CardDescription, CardTitle } from "@dokanx/ui";

export function WorkspaceCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-2">{description}</CardDescription>
      <div className="mt-6">{children}</div>
    </Card>
  );
}
