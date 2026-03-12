"use client";

import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="p-6">
        <Card>
          <CardTitle>Merchant module failed</CardTitle>
          <CardDescription className="mt-2">
            An integration request failed while loading the dashboard.
          </CardDescription>
          <Button className="mt-4" onClick={reset}>
            Retry
          </Button>
        </Card>
      </body>
    </html>
  );
}
