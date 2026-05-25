import pino from "pino";

export type OnaiLogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";
export type OnaiLogMethod = (obj: unknown, msg?: string, ...args: unknown[]) => void;

export interface OnaiLogger {
  trace?: OnaiLogMethod;
  debug?: OnaiLogMethod;
  info?: OnaiLogMethod;
  warn?: OnaiLogMethod;
  error?: OnaiLogMethod;
  child?: (bindings: Record<string, unknown>) => OnaiLogger;
}

export type OnaiLoggerConfig = boolean | OnaiLogger;

export interface ResolvedOnaiLogger {
  readonly enabled: boolean;
  trace(obj: Record<string, unknown>, msg?: string): void;
  debug(obj: Record<string, unknown>, msg?: string): void;
  info(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
  error(obj: Record<string, unknown>, msg?: string): void;
  child(bindings: Record<string, unknown>): ResolvedOnaiLogger;
}

const noopLogger: ResolvedOnaiLogger = {
  enabled: false,
  trace: noop,
  debug: noop,
  info: noop,
  warn: noop,
  error: noop,
  child: () => noopLogger,
};

export function resolveOnaiLogger(
  logger: OnaiLoggerConfig | undefined,
  level: OnaiLogLevel = "info",
): ResolvedOnaiLogger {
  if (!logger) {
    return noopLogger;
  }

  if (logger === true) {
    return wrapLogger(
      pino({
        name: "onai-sdk",
        level,
        redact: {
          paths: [
            "*.token",
            "*.refreshToken",
            "*.firebaseApiKey",
            "*.authorization",
            "*.signedUrl",
            "*.uploadUrl",
            "*.body",
            "*.bodyBase64",
            "token",
            "refreshToken",
            "firebaseApiKey",
            "authorization",
            "signedUrl",
            "uploadUrl",
            "body",
            "bodyBase64",
          ],
          censor: "[redacted]",
        },
      }),
    );
  }

  return wrapLogger(logger);
}

export function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeForLog);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => {
      const normalizedKey = key.toLowerCase();

      if (
        normalizedKey.includes("token") ||
        normalizedKey.includes("authorization") ||
        normalizedKey.includes("apikey") ||
        normalizedKey.includes("api_key") ||
        normalizedKey.includes("signedurl") ||
        normalizedKey.includes("uploadurl") ||
        normalizedKey === "body" ||
        normalizedKey === "bodybase64" ||
        normalizedKey.includes("password")
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeForLog(entryValue)];
    }),
  );
}

function wrapLogger(logger: OnaiLogger, bindings: Record<string, unknown> = {}): ResolvedOnaiLogger {
  return {
    enabled: true,
    trace: (obj, msg) => writeLog(logger, bindings, "trace", obj, msg),
    debug: (obj, msg) => writeLog(logger, bindings, "debug", obj, msg),
    info: (obj, msg) => writeLog(logger, bindings, "info", obj, msg),
    warn: (obj, msg) => writeLog(logger, bindings, "warn", obj, msg),
    error: (obj, msg) => writeLog(logger, bindings, "error", obj, msg),
    child: (childBindings) => {
      if (typeof logger.child === "function") {
        return wrapLogger(logger.child(childBindings));
      }

      return wrapLogger(logger, {
        ...bindings,
        ...childBindings,
      });
    },
  };
}

function writeLog(
  logger: OnaiLogger,
  bindings: Record<string, unknown>,
  level: Exclude<OnaiLogLevel, "silent">,
  obj: Record<string, unknown>,
  msg?: string,
): void {
  const method = logger[level];

  if (typeof method !== "function") {
    return;
  }

  try {
    method.call(
      logger,
      {
        ...bindings,
        ...(sanitizeForLog(obj) as Record<string, unknown>),
      },
      msg,
    );
  } catch {
    // Logging must never break SDK calls.
  }
}

function noop(): void {}
