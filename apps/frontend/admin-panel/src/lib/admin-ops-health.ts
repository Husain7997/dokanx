import { opsThresholds, type OpsThresholdSettings } from "@/config/ops-thresholds";

export type QueueState = {
  name?: string;
  counts?: Record<string, number>;
  deadLetter?: Record<string, number>;
  oldestWaitingMs?: number;
};

export type OutboxState = {
  pending?: number;
  inFlight?: number;
  errored?: number;
  oldestPendingAt?: string | null;
  oldestPendingLagMs?: number;
};

export type OpsHealthStatus = {
  label: "stable" | "watch" | "critical";
  variant: "success" | "warning" | "danger";
};

export const OPS_LAG_WATCH_MS = opsThresholds.lagWatchMs;
export const OPS_LAG_CRITICAL_MS = opsThresholds.lagCriticalMs;
export const QUEUE_WAITING_WATCH = opsThresholds.queueWaitingWatch;
export const QUEUE_ACTIVE_WATCH = opsThresholds.queueActiveWatch;
export const OUTBOX_PENDING_WATCH = opsThresholds.outboxPendingWatch;

export function resolveOpsThresholds(override?: Partial<OpsThresholdSettings>): OpsThresholdSettings {
  return {
    lagWatchMs: Number(override?.lagWatchMs ?? opsThresholds.lagWatchMs),
    lagCriticalMs: Number(override?.lagCriticalMs ?? opsThresholds.lagCriticalMs),
    queueWaitingWatch: Number(override?.queueWaitingWatch ?? opsThresholds.queueWaitingWatch),
    queueActiveWatch: Number(override?.queueActiveWatch ?? opsThresholds.queueActiveWatch),
    outboxPendingWatch: Number(override?.outboxPendingWatch ?? opsThresholds.outboxPendingWatch),
  };
}

export function formatOpsLag(ms?: number) {
  if (!ms || ms <= 0) return "0m";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function getOpsHealth(waiting: number, failed: number, lag: number, active = 0, override?: Partial<OpsThresholdSettings>): OpsHealthStatus {
  const thresholds = resolveOpsThresholds(override);
  if (failed > 0 || lag >= thresholds.lagCriticalMs) {
    return { label: "critical", variant: "danger" };
  }
  if (
    waiting >= thresholds.queueWaitingWatch ||
    active >= thresholds.queueActiveWatch ||
    lag >= thresholds.lagWatchMs
  ) {
    return { label: "watch", variant: "warning" };
  }
  return { label: "stable", variant: "success" };
}

export function getQueueHealth(queue?: QueueState, override?: Partial<OpsThresholdSettings>) {
  const waiting = Number(queue?.counts?.waiting || 0);
  const active = Number(queue?.counts?.active || 0);
  const failed = Number(queue?.counts?.failed || 0);
  const lag = Number(queue?.oldestWaitingMs || 0);
  return getOpsHealth(waiting, failed, lag, active, override);
}

export function getOutboxHealth(outbox?: OutboxState, override?: Partial<OpsThresholdSettings>) {
  const thresholds = resolveOpsThresholds(override);
  const pending = Number(outbox?.pending || 0);
  const errored = Number(outbox?.errored || 0);
  const lag = Number(outbox?.oldestPendingLagMs || 0);

  if (errored > 0 || lag >= thresholds.lagCriticalMs) {
    return { label: "critical", variant: "danger" } as const;
  }
  if (pending >= thresholds.outboxPendingWatch || lag >= thresholds.lagWatchMs) {
    return { label: "watch", variant: "warning" } as const;
  }
  return { label: "stable", variant: "success" } as const;
}
