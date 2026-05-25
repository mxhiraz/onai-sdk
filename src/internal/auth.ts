import { OnaiAuthError, OnaiValidationError } from "./errors.js";
import type { ResolvedOnaiLogger } from "./logger.js";

interface FirebaseTokenProviderConfig {
  refreshToken: string;
  firebaseApiKey: string;
  firebaseRefreshTokenEndpoint: string;
  fetch: typeof fetch;
  logger: ResolvedOnaiLogger;
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

export class FirebaseTokenProvider {
  private refreshToken: string;
  private readonly firebaseApiKey: string;
  private readonly firebaseRefreshTokenEndpoint: string;
  private readonly fetch: typeof fetch;
  private readonly logger: ResolvedOnaiLogger;
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
  }

  async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.expiresAt - 60_000) {
      this.logger.trace(
        {
          event: "auth.token_cache.hit",
          expiresAt: new Date(this.expiresAt).toISOString(),
        },
        "Santos auth token cache hit.",
      );
      return this.cachedToken;
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
    this.logger.debug(
      {
        event: "auth.token_refresh.success",
        status: response.status,
        durationMs,
        expiresAt: new Date(this.expiresAt).toISOString(),
      },
      "Santos auth token refresh completed.",
    );

    return token;
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

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
