import { OnaiValidationError } from "./internal/errors.js";
import type { OnaiAuthTokenChangeHandler, OnaiPersistedAuthTokenState } from "./internal/auth.js";
import { resolveOnaiLogger, type OnaiLoggerConfig, type OnaiLogLevel, type ResolvedOnaiLogger } from "./internal/logger.js";
import { resolveOnaiRequestHeaders, type ResolvedOnaiRequestHeaders } from "./internal/request-headers.js";
import { resolveOnaiRuntimeUrls, type OnaiRuntimeUrlOverrides } from "./runtime-config.js";

export interface OnaiClientConfig {
  refreshToken?: string | undefined;
  firebaseApiKey: string;
  workspaceId: string;
  urls?: OnaiRuntimeUrlOverrides | undefined;
  endpoint?: string | undefined;
  fetch?: typeof fetch | undefined;
  origin?: string | undefined;
  referer?: string | undefined;
  logger?: OnaiLoggerConfig | undefined;
  logLevel?: OnaiLogLevel | undefined;
  accessToken?: string | null | undefined;
  accessTokenExpiresAt?: number | string | Date | null | undefined;
  authTokenState?: OnaiPersistedAuthTokenState | undefined;
  authRefreshSkewMs?: number | undefined;
  onAuthTokenChange?: OnaiAuthTokenChangeHandler | undefined;
}

export interface ResolvedOnaiClientConfig {
  refreshToken: string;
  firebaseApiKey: string;
  workspaceId: string;
  endpoint: string;
  fetch: typeof fetch;
  origin: string;
  referer: string;
  firebaseRefreshTokenEndpoint: string;
  headers: ResolvedOnaiRequestHeaders;
  logger: ResolvedOnaiLogger;
  accessToken: string | null | undefined;
  accessTokenExpiresAt: number | string | Date | null | undefined;
  authRefreshSkewMs: number | undefined;
  onAuthTokenChange: OnaiAuthTokenChangeHandler | undefined;
}

export function resolveOnaiConfig(config: OnaiClientConfig): ResolvedOnaiClientConfig {
  assertServerRuntime();

  const fetchImpl = config.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new OnaiValidationError("A fetch implementation is required.");
  }

  const runtimeUrlOverrides: OnaiRuntimeUrlOverrides = {
    ...config.urls,
  };

  if (config.endpoint) {
    runtimeUrlOverrides.graphqlEndpoint = config.endpoint;
  }

  if (config.origin) {
    runtimeUrlOverrides.webOrigin = config.origin;
  }

  if (config.referer) {
    runtimeUrlOverrides.webReferer = config.referer;
  }

  const runtimeUrls = resolveOnaiRuntimeUrls(runtimeUrlOverrides);

  return {
    refreshToken: requireNonEmpty(config.authTokenState?.refreshToken ?? config.refreshToken, "refreshToken"),
    firebaseApiKey: requireNonEmpty(config.firebaseApiKey, "firebaseApiKey"),
    workspaceId: requireNonEmpty(config.workspaceId, "workspaceId"),
    endpoint: runtimeUrls.graphqlEndpoint,
    fetch: fetchImpl,
    origin: runtimeUrls.webOrigin,
    referer: runtimeUrls.webReferer,
    firebaseRefreshTokenEndpoint: runtimeUrls.firebaseRefreshTokenEndpoint,
    headers: resolveOnaiRequestHeaders(),
    logger: resolveOnaiLogger(config.logger, config.logLevel),
    accessToken: config.authTokenState?.accessToken ?? config.accessToken,
    accessTokenExpiresAt: config.authTokenState?.accessTokenExpiresAt ?? config.accessTokenExpiresAt,
    authRefreshSkewMs: config.authRefreshSkewMs,
    onAuthTokenChange: config.onAuthTokenChange,
  };
}

function assertServerRuntime(): void {
  if ("window" in globalThis) {
    throw new OnaiValidationError("The OnAI SDK is server-side only. Do not expose refresh tokens in browser code.");
  }
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}
