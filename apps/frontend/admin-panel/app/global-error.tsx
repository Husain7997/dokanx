"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="grid min-h-screen place-items-center bg-slate-950 text-slate-50">
        <div className="max-w-md space-y-4 rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <h2 className="text-xl font-semibold">Admin console error</h2>
          <p className="text-sm text-slate-300">{error.message}</p>
          <button
            className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
            onClick={() => reset()}
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
