import type { SantosGraphqlClient } from "../internal/graphql.js";

export interface RawGraphqlRequest {
  operationName: string;
  variables?: Record<string, unknown>;
  query: string;
}

export class RawResource {
  private readonly graphql: SantosGraphqlClient;

  constructor(graphql: SantosGraphqlClient) {
    this.graphql = graphql;
  }

  graphqlRequest<TData>(request: RawGraphqlRequest): Promise<TData> {
    return this.graphql.request<TData>(request);
  }
}
