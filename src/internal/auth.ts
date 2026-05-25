import { OnaiAuthError, OnaiValidationError } from "./errors.js";

interface FirebaseTokenProviderConfig {
  refreshToken: string;
  firebaseApiKey: string;
  firebaseRefreshTokenEndpoint: string;
  fetch: typeof fetch;
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
  }

  async getToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.expiresAt - 60_000) {
      return this.cachedToken;
    }

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken,
    });

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

    if (!response.ok) {
      throw new OnaiAuthError("Could not refresh authentication.", {
        status: response.status,
        details: {
          reason: "token_refresh_failed",
        },
      });
    }

    const token = payload.id_token ?? payload.access_token;

    if (!token) {
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
