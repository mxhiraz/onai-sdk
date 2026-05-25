import { OnaiApiError } from "./errors.js";
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
}

interface GraphqlRequest {
  operationName: string;
  variables?: Record<string, unknown>;
  query: string;
}

interface GraphqlResponse<TData> {
  data?: TData;
  errors?: Array<{ message?: string; extensions?: Record<string, unknown> }>;
}

export class SantosGraphqlClient {
  private readonly endpoint: string;
  private readonly fetch: typeof fetch;
  private readonly tokenProvider: TokenProvider;
  private readonly workspaceId: string;
  private readonly origin: string;
  private readonly referer: string;
  private readonly headers: ResolvedOnaiRequestHeaders;

  constructor(config: SantosGraphqlClientConfig) {
    this.endpoint = config.endpoint;
    this.fetch = config.fetch;
    this.tokenProvider = config.tokenProvider;
    this.workspaceId = config.workspaceId;
    this.origin = config.origin;
    this.referer = config.referer;
    this.headers = config.headers;
  }

  async request<TData>(request: GraphqlRequest): Promise<TData> {
    const token = await this.tokenProvider.getToken();
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

    const payload = await readJson<GraphqlResponse<TData>>(response);

    if (!response.ok) {
      throw new OnaiApiError("Santos request failed.", {
        status: response.status,
        details: {
          operationName: request.operationName,
        },
      });
    }

    if (payload.errors?.length) {
      throw new OnaiApiError("Santos returned an error.", {
        status: response.status,
        details: {
          operationName: request.operationName,
          errorCount: payload.errors.length,
        },
      });
    }

    if (!payload.data) {
      throw new OnaiApiError("Santos response did not include data.", {
        status: response.status,
        details: {
          operationName: request.operationName,
        },
      });
    }

    return payload.data;
  }
}

async function readJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}
