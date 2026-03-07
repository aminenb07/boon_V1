require("dotenv/config");

const NODE_ENV = process.env.NODE_ENV?.trim() || "development";
const DATABASE_URL = process.env.DATABASE_URL?.trim() || "";
const JWT_SECRET = process.env.JWT_SECRET?.trim() || "";
const PUBLIC_API_BASE_URL = process.env.PUBLIC_API_BASE_URL?.trim() || "";
const CORS_ORIGIN = process.env.CORS_ORIGIN?.trim() || "";
const SMS_WEBHOOK_URL = process.env.SMS_WEBHOOK_URL?.trim() || "";
const ALLOW_DEV_VERIFICATION_CODE =
  process.env.ALLOW_DEV_VERIFICATION_CODE?.trim() || "";

const errors = [];
const warnings = [];

function requireValue(name, value) {
  if (!value) {
    errors.push(`${name} is required.`);
  }
}

function requireUrlOrigin(name, value) {
  if (!value) return;
  try {
    const parsed = new URL(value);
    if (parsed.pathname && parsed.pathname !== "/") {
      warnings.push(`${name} should usually be an origin without a path: ${parsed.origin}`);
    }
  } catch (_error) {
    errors.push(`${name} must be a valid URL.`);
  }
}

if (NODE_ENV === "production") {
  requireValue("DATABASE_URL", DATABASE_URL);
  requireValue("JWT_SECRET", JWT_SECRET);
  requireValue("CORS_ORIGIN", CORS_ORIGIN);

  if (DATABASE_URL.startsWith("file:")) {
    errors.push("DATABASE_URL cannot use a local file database in production.");
  }

  if (JWT_SECRET && JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET should be at least 32 characters long.");
  }

  if (ALLOW_DEV_VERIFICATION_CODE.toLowerCase() === "true") {
    errors.push("ALLOW_DEV_VERIFICATION_CODE must stay false in production.");
  }

  if (!SMS_WEBHOOK_URL) {
    warnings.push(
      "SMS_WEBHOOK_URL is not configured. Public phone verification codes will not be delivered.",
    );
  }
}

if (PUBLIC_API_BASE_URL) {
  requireUrlOrigin("PUBLIC_API_BASE_URL", PUBLIC_API_BASE_URL);
}

if (CORS_ORIGIN) {
  for (const origin of CORS_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean)) {
    requireUrlOrigin("CORS_ORIGIN", origin);
  }
}

if (errors.length > 0) {
  console.error("BOON backend env check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  if (warnings.length > 0) {
    console.warn("Warnings:");
    for (const warning of warnings) {
      console.warn(`- ${warning}`);
    }
  }
  process.exit(1);
}

console.log("BOON backend env check passed.");
if (warnings.length > 0) {
  console.warn("Warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}
