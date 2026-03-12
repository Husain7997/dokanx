"use client";

import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="p-6">
        <Card>
          <CardTitle>Admin page failed</CardTitle>
          <CardDescription className="mt-2">
            The admin integration layer returned an error.
          </CardDescription>
          <Button className="mt-4" onClick={reset}>
            Retry
          </Button>
        </Card>
      </body>
    </html>
  );
}
