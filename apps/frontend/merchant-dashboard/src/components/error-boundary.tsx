"use client";

import type { ReactNode } from "react";
import { Component } from "react";

import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardTitle>Merchant dashboard failed</CardTitle>
          <CardDescription className="mt-2">
            Retry the current merchant module.
          </CardDescription>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Card>
      );
    }

    return this.props.children;
  }
}
