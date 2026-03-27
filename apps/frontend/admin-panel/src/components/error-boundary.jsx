"use client";
import { Component } from "react";
export class ErrorBoundary extends Component {
    constructor() {
        super(...arguments);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error) {
        console.error("Admin UI error", error);
    }
    render() {
        if (this.state.hasError) {
            return (this.props.fallback ?? (<div className="rounded-2xl border border-white/20 bg-white/70 p-6">
            <h3 className="text-lg font-semibold">Something went wrong</h3>
            <p className="text-sm text-muted-foreground">
              Reload this page or check the console logs for details.
            </p>
          </div>));
        }
        return this.props.children;
    }
}
