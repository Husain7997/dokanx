"use client";

import type { ReactNode } from "react";
import { Component } from "react";

import { Button, Card, CardDescription, CardTitle } from "@dokanx/ui";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription className="mt-2">
            The storefront hit an unexpected error.
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
