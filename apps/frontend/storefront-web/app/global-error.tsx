"use client";

import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

export default function GlobalError({
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="p-6">
        <Card>
          <CardTitle>Storefront request failed</CardTitle>
          <CardDescription className="mt-2">
            A frontend integration layer failed while loading this page.
          </CardDescription>
          <Button className="mt-4" onClick={reset}>
            Retry
          </Button>
        </Card>
      </body>
    </html>
  );
}
