export default function DocsPage() {
  return (
    <section className="grid gap-6 rounded-3xl border border-white/40 bg-white/70 p-8">
      <div>
        <h2 className="dx-display text-2xl">Docs & Guides</h2>
        <p className="text-sm text-muted-foreground">
          Everything you need to build on DokanX: auth, APIs, webhooks, and SDKs.
        </p>
      </div>
      <div className="grid gap-5 text-sm text-muted-foreground">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Getting started</p>
          <p>
            Create a developer account from the Sandbox page, register an OAuth app, and generate an API
            key for server-to-server calls.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Authentication</p>
          <p>
            Use OAuth 2.0 for user-authorized access. Exchange authorization codes for access tokens at
            <code className="mx-1 rounded bg-white/80 px-2 py-0.5 text-xs">/oauth/token</code>.
          </p>
          <p>
            The consent screen lives at
            <code className="mx-1 rounded bg-white/80 px-2 py-0.5 text-xs">/oauth/consent</code> and
            displays requested scopes before approval.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">API keys</p>
          <p>
            Include <code className="mx-1 rounded bg-white/80 px-2 py-0.5 text-xs">x-api-key</code> on
            public API calls. Keys have scopes and usage limits.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Webhooks</p>
          <p>
            Verify signatures using HMAC SHA-256 with the webhook secret. Signature header:
            <code className="mx-1 rounded bg-white/80 px-2 py-0.5 text-xs">x-dokanx-signature</code>.
          </p>
          <p>
            Test locally with
            <code className="mx-1 rounded bg-white/80 px-2 py-0.5 text-xs">
              node scripts/webhook-signature.js &lt;secret&gt; &lt;payload&gt;
            </code>
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">SDKs</p>
          <p>Minimal JS/Python/PHP SDK stubs are available in the /sdk folder.</p>
        </div>
      </div>
    </section>
  );
}
