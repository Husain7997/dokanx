function readNumber(name: string, fallback: number) {
  const raw = process.env[name];
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export type OpsThresholdSettings = {
  lagWatchMs: number;
  lagCriticalMs: number;
  queueWaitingWatch: number;
  queueActiveWatch: number;
  outboxPendingWatch: number;
};

// Frontend-first tuning layer for admin operational pressure views.
// These can later be replaced or hydrated from backend settings without changing consumers.
export const opsThresholds: OpsThresholdSettings = {
  lagWatchMs: readNumber("NEXT_PUBLIC_OPS_LAG_WATCH_MS", 60_000),
  lagCriticalMs: readNumber("NEXT_PUBLIC_OPS_LAG_CRITICAL_MS", 300_000),
  queueWaitingWatch: readNumber("NEXT_PUBLIC_QUEUE_WAITING_WATCH", 20),
  queueActiveWatch: readNumber("NEXT_PUBLIC_QUEUE_ACTIVE_WATCH", 10),
  outboxPendingWatch: readNumber("NEXT_PUBLIC_OUTBOX_PENDING_WATCH", 50),
};
