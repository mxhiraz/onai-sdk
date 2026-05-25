import { OnaiValidationError } from "./internal/errors.js";
import {
  resolveOnaiRequestHeaders,
  type OnaiRequestHeadersConfig,
  type ResolvedOnaiRequestHeaders,
} from "./internal/request-headers.js";
import { resolveOnaiRuntimeUrls, type OnaiRuntimeUrlOverrides } from "./runtime-config.js";

export interface OnaiClientConfig {
  refreshToken: string;
  firebaseApiKey: string;
  workspaceId: string;
  urls?: OnaiRuntimeUrlOverrides | undefined;
  endpoint?: string | undefined;
  fetch?: typeof fetch | undefined;
  headers?: OnaiRequestHeadersConfig | undefined;
  origin?: string | undefined;
  referer?: string | undefined;
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
    refreshToken: requireNonEmpty(config.refreshToken, "refreshToken"),
    firebaseApiKey: requireNonEmpty(config.firebaseApiKey, "firebaseApiKey"),
    workspaceId: requireNonEmpty(config.workspaceId, "workspaceId"),
    endpoint: runtimeUrls.graphqlEndpoint,
    fetch: fetchImpl,
    origin: runtimeUrls.webOrigin,
    referer: runtimeUrls.webReferer,
    firebaseRefreshTokenEndpoint: runtimeUrls.firebaseRefreshTokenEndpoint,
    headers: resolveOnaiRequestHeaders(config.headers),
  };
}

function assertServerRuntime(): void {
  if ("window" in globalThis) {
    throw new OnaiValidationError("The OnAI SDK is server-side only. Do not expose refresh tokens in browser code.");
  }
}

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}
