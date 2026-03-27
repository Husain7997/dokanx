const mongoose = require("mongoose");
const { EventEmitter } = require("events");
const { getRequestContext } = require("../../middlewares/requestContext");

const connectionEvents = new EventEmitter();

const DEFAULT_MAX_RETRIES = Number(process.env.MONGO_MAX_RETRIES || 8);
const DEFAULT_BASE_DELAY_MS = Number(process.env.MONGO_RETRY_BASE_DELAY_MS || 500);
const DEFAULT_MAX_DELAY_MS = Number(process.env.MONGO_RETRY_MAX_DELAY_MS || 10000);
const SERVER_SELECTION_TIMEOUT_MS = Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000);

let listenersAttached = false;
let connectPromise = null;
let reconnectTimer = null;
let retryAttempt = 0;
let activeUri = null;

function getRequestId() {
  return getRequestContext()?.requestId || null;
}

function log(event, extra = {}) {
  const payload = {
    event,
    requestId: extra.requestId ?? getRequestId(),
    activeUri: activeUri ? maskUri(activeUri) : null,
    ...extra,
  };

  if (event.includes("ERROR") || event.includes("FAILED")) {
    console.error("[mongo]", payload);
    return;
  }

  console.log("[mongo]", payload);
}

function maskUri(uri) {
  try {
    const parsed = new URL(uri);
    const host = parsed.host || "unknown-host";
    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, "") : "";
    return `${parsed.protocol}//${host}${dbName ? `/${dbName}` : ""}`;
  } catch {
    return "unparseable-uri";
  }
}

function getMongoUris() {
  return [process.env.MONGO_URI, process.env.MONGO_URI_FALLBACK].filter(Boolean);
}

function getMongoState() {
  return {
    readyState: mongoose.connection.readyState,
    connected: mongoose.connection.readyState === 1,
    connecting: mongoose.connection.readyState === 2,
    disconnecting: mongoose.connection.readyState === 3,
    activeUri: activeUri ? maskUri(activeUri) : null,
    retryAttempt,
  };
}

function isMongoConnected() {
  return mongoose.connection.readyState === 1;
}

function computeDelay(attempt) {
  const delay = DEFAULT_BASE_DELAY_MS * (2 ** Math.max(0, attempt - 1));
  return Math.min(DEFAULT_MAX_DELAY_MS, delay);
}

function attachListeners() {
  if (listenersAttached) {
    return;
  }

  listenersAttached = true;

  connectionEvents.on("reconnecting", (payload) => {
    log("MONGO_RECONNECTING", payload);
  });

  mongoose.connection.on("connected", () => {
    retryAttempt = 0;
    log("MONGO_CONNECTED", { readyState: mongoose.connection.readyState });
  });

  mongoose.connection.on("disconnected", () => {
    log("MONGO_DISCONNECTED", { readyState: mongoose.connection.readyState });
    scheduleReconnect("disconnected");
  });

  mongoose.connection.on("error", (error) => {
    log("MONGO_ERROR", {
      message: error?.message || "Unknown Mongo error",
      readyState: mongoose.connection.readyState,
    });
  });

  mongoose.connection.on("reconnected", () => {
    retryAttempt = 0;
    log("MONGO_RECONNECTED", { readyState: mongoose.connection.readyState });
  });
}

async function tryConnectUri(uri, attempt, reason) {
  connectionEvents.emit("reconnecting", {
    attempt,
    reason,
    uri: maskUri(uri),
    requestId: getRequestId(),
  });

  if (mongoose.connection.readyState === 2 || mongoose.connection.readyState === 3) {
    return mongoose;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  activeUri = uri;

  return mongoose.connect(uri, {
    autoIndex: false,
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });
}

async function connectMongo({ reason = "startup", background = false } = {}) {
  attachListeners();

  if (isMongoConnected()) {
    return mongoose;
  }

  if (connectPromise) {
    return background ? undefined : connectPromise;
  }

  const uris = getMongoUris();
  if (!uris.length) {
    throw new Error("Missing Mongo URI configuration");
  }

  connectPromise = (async () => {
    let lastError = null;

    for (let attempt = 1; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
      retryAttempt = attempt;

      for (const uri of uris) {
        try {
          await tryConnectUri(uri, attempt, reason);
          activeUri = uri;
          return mongoose;
        } catch (error) {
          lastError = error;
          log("MONGO_CONNECT_FAILED", {
            attempt,
            reason,
            uri: maskUri(uri),
            message: error?.message || "Mongo connection failed",
          });

          if (mongoose.connection.readyState !== 0) {
            try {
              await mongoose.disconnect();
            } catch {
              // Ignore cleanup failure between retries.
            }
          }
        }
      }

      const delayMs = computeDelay(attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    log("MONGO_CONNECT_RETRY_EXHAUSTED", {
      reason,
      maxRetries: DEFAULT_MAX_RETRIES,
      message: lastError?.message || "Mongo retry limit reached",
    });

    throw lastError || new Error("Mongo retry limit reached");
  })();

  if (background) {
    connectPromise
      .catch(() => undefined)
      .finally(() => {
        connectPromise = null;
      });
    return undefined;
  }

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
}

function scheduleReconnect(reason = "manual") {
  if (reconnectTimer || connectPromise || isMongoConnected()) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectMongo({ reason, background: true });
  }, 0);
}

module.exports = {
  connectMongo,
  scheduleReconnect,
  isMongoConnected,
  getMongoState,
  connectionEvents,
  mongoose,
};
