const { getConfig, setConfig } = require("@/platform/config/platformConfig.service");

const PANIC_MODE_KEY = "system.panic_mode";

function normalizeState(state = {}) {
  return {
    enabled: Boolean(state.enabled),
    reason: String(state.reason || "").trim(),
    updatedBy: state.updatedBy || null,
    updatedAt: state.updatedAt || null,
  };
}

async function getPanicModeState() {
  const current = await getConfig({
    key: PANIC_MODE_KEY,
    fallback: {
      enabled: false,
      reason: "",
      updatedBy: null,
      updatedAt: null,
    },
  });

  return normalizeState(current);
}

async function setPanicModeState({ enabled, reason = "", updatedBy = null }) {
  const nextState = normalizeState({
    enabled,
    reason,
    updatedBy,
    updatedAt: new Date().toISOString(),
  });

  await setConfig({
    key: PANIC_MODE_KEY,
    value: nextState,
    scope: "GLOBAL",
    description: "Emergency write lock for DokanX platform",
  });

  return nextState;
}

async function isPanicModeEnabled() {
  const current = await getPanicModeState();
  return current.enabled;
}

module.exports = {
  PANIC_MODE_KEY,
  getPanicModeState,
  setPanicModeState,
  isPanicModeEnabled,
};
