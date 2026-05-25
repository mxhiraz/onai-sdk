import { OnaiAuthError, OnaiValidationError } from "./errors.js";
import type { ResolvedOnaiLogger } from "./logger.js";

interface FirebaseTokenProviderConfig {
  refreshToken: string;
  firebaseApiKey: string;
  firebaseRefreshTokenEndpoint: string;
  fetch: typeof fetch;
  logger: ResolvedOnaiLogger;
  accessToken?: string | null | undefined;
  accessTokenExpiresAt?: number | string | Date | null | undefined;
  onAuthTokenChange?: OnaiAuthTokenChangeHandler | undefined;
  authRefreshSkewMs?: number | undefined;
}

interface FirebaseRefreshResponse {
  id_token?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: string | number;
  error?: {
    message?: string;
  };
}

export interface OnaiAuthTokenState {
  accessToken: string;
  accessTokenExpiresAt: number;
  refreshToken: string;
}

export interface OnaiPersistedAuthTokenState {
  accessToken?: string | null;
  accessTokenExpiresAt?: number | string | Date | null;
  refreshToken: string;
}

export type OnaiAuthTokenChangeHandler = (state: OnaiAuthTokenState) => void | Promise<void>;

export interface GetOnaiAuthTokenStateInput {
  forceRefresh?: boolean;
}

export class FirebaseTokenProvider {
  private refreshToken: string;
  private readonly firebaseApiKey: string;
  private readonly firebaseRefreshTokenEndpoint: string;
  private readonly fetch: typeof fetch;
  private readonly logger: ResolvedOnaiLogger;
  private readonly onAuthTokenChange: OnaiAuthTokenChangeHandler | undefined;
  private readonly refreshSkewMs: number;
  private cachedToken: string | null = null;
  private expiresAt = 0;

  constructor(config: FirebaseTokenProviderConfig) {
    this.refreshToken = requireNonEmpty(config.refreshToken, "refreshToken");
    this.firebaseApiKey = requireNonEmpty(config.firebaseApiKey, "firebaseApiKey");
    this.firebaseRefreshTokenEndpoint = requireNonEmpty(
      config.firebaseRefreshTokenEndpoint,
      "firebaseRefreshTokenEndpoint",
    );
    this.fetch = config.fetch;
    this.logger = config.logger;
    this.onAuthTokenChange = config.onAuthTokenChange;
    this.refreshSkewMs = normalizeRefreshSkewMs(config.authRefreshSkewMs);

    if (config.accessToken) {
      const expiresAt = normalizeAccessTokenExpiresAt(config.accessTokenExpiresAt);

      if (!expiresAt) {
        throw new OnaiValidationError("accessTokenExpiresAt is required when accessToken is provided.");
      }

      this.cachedToken = requireNonEmpty(config.accessToken, "accessToken");
      this.expiresAt = expiresAt;
    }
  }

  async getToken(): Promise<string> {
    return (await this.getTokenState()).accessToken;
  }

  async getTokenState(input: GetOnaiAuthTokenStateInput = {}): Promise<OnaiAuthTokenState> {
    if (!input.forceRefresh && this.hasUsableCachedToken()) {
      this.logger.trace(
        {
          event: "auth.token_cache.hit",
          expiresAt: new Date(this.expiresAt).toISOString(),
        },
        "Santos auth token cache hit.",
      );
      return this.currentTokenState();
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    });

    const startedAt = Date.now();
    this.logger.debug(
      {
        event: "auth.token_refresh.start",
      },
      "Santos auth token refresh started.",
    );

    const response = await this.fetch(
      `${this.firebaseRefreshTokenEndpoint}?key=${encodeURIComponent(this.firebaseApiKey)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      },
    );

    const payload = await readJson<FirebaseRefreshResponse>(response);
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      this.logger.error(
        {
          event: "auth.token_refresh.error",
          status: response.status,
          durationMs,
          reason: payload.error?.message ?? "token_refresh_failed",
        },
        "Santos auth token refresh failed.",
      );
      throw new OnaiAuthError("Could not refresh authentication.", {
        status: response.status,
        details: {
          reason: "token_refresh_failed",
        },
      });
    }

    const token = payload.id_token ?? payload.access_token;

    if (!token) {
      this.logger.error(
        {
          event: "auth.token_refresh.missing_token",
          status: response.status,
          durationMs,
        },
        "Santos auth token refresh did not return a token.",
      );
      throw new OnaiAuthError("Authentication response did not include a token.", {
        status: response.status,
        details: {
          reason: "missing_token",
        },
      });
    }

    this.cachedToken = token;
    this.refreshToken = payload.refresh_token ?? this.refreshToken;
    this.expiresAt = Date.now() + parseExpiresIn(payload.expires_in);
    const tokenState = this.currentTokenState();
    this.logger.debug(
      {
        event: "auth.token_refresh.success",
        status: response.status,
        durationMs,
        expiresAt: new Date(this.expiresAt).toISOString(),
      },
      "Santos auth token refresh completed.",
    );
    await this.notifyAuthTokenChange(tokenState);

    return tokenState;
  }

  getCachedTokenState(): OnaiAuthTokenState | null {
    if (!this.cachedToken) {
      return null;
    }

    return this.currentTokenState();
  }

  private hasUsableCachedToken(): boolean {
    return Boolean(this.cachedToken) && Date.now() < this.expiresAt - this.refreshSkewMs;
  }

  private currentTokenState(): OnaiAuthTokenState {
    if (!this.cachedToken) {
      throw new OnaiAuthError("Authentication token is not available.", {
        details: {
          reason: "missing_cached_token",
        },
      });
    }

    return {
      accessToken: this.cachedToken,
      accessTokenExpiresAt: this.expiresAt,
      refreshToken: this.refreshToken,
    };
  }

  private async notifyAuthTokenChange(state: OnaiAuthTokenState): Promise<void> {
    if (!this.onAuthTokenChange) {
      return;
    }

    try {
      await this.onAuthTokenChange(state);
    } catch (error) {
      this.logger.warn(
        {
          event: "auth.token_change_callback.error",
          error: error instanceof Error ? error.message : String(error),
        },
        "Santos auth token change callback failed.",
      );
    }
  }
}

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}

function parseExpiresIn(value: string | number | undefined): number {
  const seconds = Number(value ?? 3600);
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 3600;
  return safeSeconds * 1000;
}

function normalizeAccessTokenExpiresAt(value: number | string | Date | null | undefined): number {
  if (value instanceof Date) {
    return normalizeEpochMs(value.getTime());
  }

  if (typeof value === "number") {
    return normalizeEpochMs(value);
  }

  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);

    if (Number.isFinite(asNumber)) {
      return normalizeEpochMs(asNumber);
    }

    return normalizeEpochMs(Date.parse(value));
  }

  return 0;
}

function normalizeEpochMs(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return value < 10_000_000_000 ? value * 1000 : value;
}

function normalizeRefreshSkewMs(value: number | undefined): number {
  if (value === undefined) {
    return 60_000;
  }

  if (!Number.isFinite(value) || value < 0) {
    throw new OnaiValidationError("authRefreshSkewMs must be a non-negative number.");
  }

  return value;
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
