const cors = require("cors");

function parseAllowedOrigins() {
  return String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseCookies(req, _res, next) {
  const header = String(req.headers.cookie || "");
  const cookies = {};

  header.split(";").forEach((part) => {
    const [rawName, ...rest] = part.split("=");
    const name = String(rawName || "").trim();
    if (!name) return;
    cookies[name] = decodeURIComponent(rest.join("=").trim());
  });

  req.cookies = cookies;
  next();
}

function enforceHttps(req, res, next) {
  const shouldEnforce =
    String(process.env.ENFORCE_HTTPS || process.env.NODE_ENV || "").toLowerCase() === "production";
  if (!shouldEnforce) return next();

  const forwardedProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  const secure = req.secure || forwardedProto === "https";
  if (secure) return next();

  return res.status(400).json({
    success: false,
    message: "HTTPS is required",
  });
}

function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'"
  );

  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));

  if (!value || typeof value !== "object") {
    if (typeof value === "string") {
      return value.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, "").trim();
    }
    return value;
  }

  const sanitized = {};
  Object.entries(value).forEach(([key, childValue]) => {
    if (key.startsWith("$") || key.includes(".")) return;
    sanitized[key] = sanitizeValue(childValue);
  });
  return sanitized;
}

function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }
  next();
}

const corsMiddleware = cors({
  origin(origin, callback) {
    const allowedOrigins = parseAllowedOrigins();
    if (!origin || !allowedOrigins.length || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Tenant-Id", "X-Tenant-Slug", "X-Device-Id"],
});

module.exports = {
  corsMiddleware,
  parseCookies,
  enforceHttps,
  securityHeaders,
  sanitizeInput,
};
