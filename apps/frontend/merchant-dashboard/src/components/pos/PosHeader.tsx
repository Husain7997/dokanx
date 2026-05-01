import { Logo } from "@dokanx/ui";

interface PosHeaderProps {
  sessionId: string | null;
  onOpenSession: () => void;
  onCloseSession: () => void;
  isBusy?: boolean;
}

export function PosHeader({ sessionId, onOpenSession, onCloseSession, isBusy }: PosHeaderProps) {
  const actionLabel = sessionId ? (isBusy ? "Closing..." : "Close Session") : (isBusy ? "Opening..." : "Open Session");

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div className="flex items-center gap-3">
        <Logo variant="icon" size="sm" />
        <div>
          <h1 className="text-xl font-semibold text-foreground">POS Terminal</h1>
          <p className="text-sm text-muted-foreground">
            {sessionId ? "Session Active" : "Session Closed"}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {!sessionId ? (
          <button
            onClick={onOpenSession}
            disabled={isBusy}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 hover:bg-primary/90"
          >
            {actionLabel}
          </button>
        ) : (
          <button
            onClick={onCloseSession}
            disabled={isBusy}
            className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground disabled:cursor-not-allowed disabled:opacity-60 hover:bg-destructive/90"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </header>
  );
}