"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@dokanx/auth";
import { getApiBaseUrl } from "@dokanx/utils";

type ConsentState = {
  appName: string;
  description: string;
  scopes: string[];
  loading: boolean;
  error: string | null;
  code: string | null;
  redirectUri: string | null;
  state: string | null;
};

function ConsentPageContent() {
  const params = useSearchParams();
  const { status } = useAuth();
  const [state, setState] = useState<ConsentState>({
    appName: "",
    description: "",
    scopes: [],
    loading: true,
    error: null,
    code: null,
    redirectUri: null,
    state: null,
  });

  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const scope = params.get("scope") || "";
  const oauthState = params.get("state") || "";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const url = new URL(`${getApiBaseUrl()}/oauth/consent`);
        url.searchParams.set("client_id", clientId);
        url.searchParams.set("redirect_uri", redirectUri);
        if (scope) url.searchParams.set("scope", scope);
        if (oauthState) url.searchParams.set("state", oauthState);

        const response = await fetch(url.toString(), { credentials: "include" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.message || "Consent fetch failed");
        if (!active) return;
        setState((current) => ({
          ...current,
          appName: payload.data?.app?.name || "",
          description: payload.data?.app?.description || "",
          scopes: payload.data?.scopes || [],
          loading: false,
          error: null,
        }));
      } catch (error) {
        if (!active) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "Consent fetch failed",
        }));
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [clientId, oauthState, redirectUri, scope]);

  async function handleApprove() {
    const url = new URL(`${getApiBaseUrl()}/oauth/authorize`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    if (scope) url.searchParams.set("scope", scope);
    if (oauthState) url.searchParams.set("state", oauthState);

    const response = await fetch(url.toString(), { credentials: "include" });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setState((current) => ({
        ...current,
        error: payload?.message || "Authorization failed",
      }));
      return;
    }

    setState((current) => ({
      ...current,
      code: payload.code || null,
      redirectUri: payload.redirectUri || redirectUri,
      state: payload.state || oauthState || null,
    }));
  }

  return (
    <section className="grid gap-6 rounded-3xl border border-white/40 bg-white/70 p-8">
      <div>
        <h2 className="dx-display text-2xl">Authorize app</h2>
        <p className="text-sm text-muted-foreground">
          Review requested scopes before approving this OAuth application.
        </p>
      </div>

      {status !== "authenticated" ? (
        <p className="text-sm text-red-600">Please sign in before approving access.</p>
      ) : null}

      {state.loading ? <p className="text-sm text-muted-foreground">Loading app details...</p> : null}
      {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

      {!state.loading && !state.error ? (
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
            <p className="text-sm font-semibold text-foreground">{state.appName}</p>
            <p className="text-xs text-muted-foreground">{state.description}</p>
          </div>
          <div className="rounded-2xl border border-white/60 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Requested scopes</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {state.scopes.map((scopeItem) => (
                <span key={scopeItem} className="rounded-full border border-white/60 bg-white px-3 py-1 text-xs">
                  {scopeItem}
                </span>
              ))}
            </div>
          </div>
          <button
            className="w-fit rounded-full border border-white/60 bg-black px-4 py-2 text-xs font-semibold text-white"
            onClick={handleApprove}
          >
            Approve access
          </button>
        </div>
      ) : null}

      {state.code ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
          <p>Authorization code: {state.code}</p>
          <p>Redirect URI: {state.redirectUri}</p>
          {state.state ? <p>State: {state.state}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

export default function ConsentPage() {
  return (
    <Suspense fallback={<section className="grid gap-6 rounded-3xl border border-white/40 bg-white/70 p-8"><p className="text-sm text-muted-foreground">Loading consent...</p></section>}>
      <ConsentPageContent />
    </Suspense>
  );
}
