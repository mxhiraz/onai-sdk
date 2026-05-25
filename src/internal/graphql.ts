import { OnaiApiError } from "./errors.js";
import { sanitizeForLog, type ResolvedOnaiLogger } from "./logger.js";
import {
  buildStandardRequestHeaders,
  buildTrackingContextHeaders,
  type ResolvedOnaiRequestHeaders,
} from "./request-headers.js";

interface TokenProvider {
  getToken(): Promise<string>;
}

interface SantosGraphqlClientConfig {
  endpoint: string;
  fetch: typeof fetch;
  tokenProvider: TokenProvider;
  workspaceId: string;
  origin: string;
  referer: string;
  headers: ResolvedOnaiRequestHeaders;
  logger: ResolvedOnaiLogger;
}

interface GraphqlRequest {
  operationName: string;
  variables?: Record<string, unknown>;
  query: string;
}

interface GraphqlError {
  message?: string;
  extensions?: Record<string, unknown>;
  path?: Array<string | number>;
}

interface GraphqlResponse<TData> {
  data?: TData;
  errors?: GraphqlError[];
}

export class SantosGraphqlClient {
  private readonly endpoint: string;
  private readonly fetch: typeof fetch;
  private readonly tokenProvider: TokenProvider;
  private readonly workspaceId: string;
  private readonly origin: string;
  private readonly referer: string;
  private readonly headers: ResolvedOnaiRequestHeaders;
  private readonly logger: ResolvedOnaiLogger;

  constructor(config: SantosGraphqlClientConfig) {
    this.endpoint = config.endpoint;
    this.fetch = config.fetch;
    this.tokenProvider = config.tokenProvider;
    this.workspaceId = config.workspaceId;
    this.origin = config.origin;
    this.referer = config.referer;
    this.headers = config.headers;
    this.logger = config.logger;
  }

  async request<TData>(request: GraphqlRequest): Promise<TData> {
    const token = await this.tokenProvider.getToken();
    const startedAt = Date.now();
    this.logger.debug(
      {
        event: "graphql.request.start",
        operationName: request.operationName,
      },
      "Santos GraphQL request started.",
    );
    this.logger.trace(
      {
        event: "graphql.request.variables",
        operationName: request.operationName,
        variables: sanitizeForLog(request.variables ?? {}),
      },
      "Santos GraphQL request variables.",
    );

    const response = await this.fetch(this.endpoint, {
      method: "POST",
      headers: buildStandardRequestHeaders(this.headers, {
        ...buildTrackingContextHeaders(this.workspaceId, this.headers, this.origin),
        accept: "*/*",
        "apollo-require-preflight": "true",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        referer: this.referer,
      }),
      body: JSON.stringify(request),
    });

    const rawBody = await response.text();
    const payload = parseJson<GraphqlResponse<TData>>(rawBody);
    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const details = buildGraphqlErrorDetails({
        operationName: request.operationName,
        response,
        rawBody,
        variables: request.variables,
        errors: payload.errors,
        reason: "http_error",
      });
      this.logger.error(
        {
          event: "graphql.request.error",
          operationName: request.operationName,
          status: response.status,
          requestId: response.headers.get("x-request-id") ?? undefined,
          durationMs,
          details,
        },
        "Santos GraphQL request failed.",
      );
      throw new OnaiApiError("Santos request failed.", {
        status: response.status,
        details,
      });
    }

    if (payload.errors?.length) {
      const details = buildGraphqlErrorDetails({
        operationName: request.operationName,
        response,
        rawBody,
        variables: request.variables,
        errors: payload.errors,
        reason: "graphql_error",
      });
      this.logger.error(
        {
          event: "graphql.request.error",
          operationName: request.operationName,
          status: response.status,
          requestId: response.headers.get("x-request-id") ?? undefined,
          durationMs,
          details,
        },
        "Santos GraphQL returned errors.",
      );
      throw new OnaiApiError("Santos returned an error.", {
        status: response.status,
        details,
      });
    }

    if (!payload.data) {
      const details = buildGraphqlErrorDetails({
        operationName: request.operationName,
        response,
        rawBody,
        variables: request.variables,
        reason: "missing_data",
      });
      this.logger.error(
        {
          event: "graphql.request.error",
          operationName: request.operationName,
          status: response.status,
          requestId: response.headers.get("x-request-id") ?? undefined,
          durationMs,
          details,
        },
        "Santos GraphQL response did not include data.",
      );
      throw new OnaiApiError("Santos response did not include data.", {
        status: response.status,
        details,
      });
    }

    this.logger.debug(
      {
        event: "graphql.request.success",
        operationName: request.operationName,
        status: response.status,
        requestId: response.headers.get("x-request-id") ?? undefined,
        rateLimitRemaining: response.headers.get("x-ratelimit-remaining") ?? undefined,
        durationMs,
      },
      "Santos GraphQL request completed.",
    );

    return payload.data;
  }
}

function parseJson<T>(rawBody: string): T {
  try {
    return JSON.parse(rawBody) as T;
  } catch {
    return {} as T;
  }
}

function buildGraphqlErrorDetails(input: {
  operationName: string;
  response: Response;
  rawBody: string;
  variables: Record<string, unknown> | undefined;
  errors?: GraphqlError[] | undefined;
  reason: string;
}): Record<string, unknown> {
  return {
    reason: input.reason,
    operationName: input.operationName,
    status: input.response.status,
    statusText: input.response.statusText,
    responseHeaders: pickDebugResponseHeaders(input.response.headers),
    graphqlErrors: input.errors?.map(normalizeGraphqlError),
    variables: sanitizeForDebug(input.variables ?? {}),
    responseBodyPreview: previewBody(input.rawBody),
  };
}

function pickDebugResponseHeaders(headers: Headers): Record<string, string> {
  const names = [
    "content-type",
    "x-request-id",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-reset",
  ];

  return Object.fromEntries(
    names
      .map((name) => [name, headers.get(name)] as const)
      .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

function normalizeGraphqlError(error: GraphqlError): Record<string, unknown> {
  return {
    message: error.message,
    path: error.path,
    code: typeof error.extensions?.code === "string" ? error.extensions.code : undefined,
  };
}

function previewBody(rawBody: string): string | undefined {
  const normalized = rawBody.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.length > 2_000 ? `${normalized.slice(0, 2_000)}...` : normalized;
}

function sanitizeForDebug(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeForDebug);
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
        normalizedKey.includes("password")
      ) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeForDebug(entryValue)];
    }),
  );
}
