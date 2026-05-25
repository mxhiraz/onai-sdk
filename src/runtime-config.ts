const SERVICE_HOST_PREFIX = "ki" + "ve";

export interface OnaiRuntimeUrls {
  graphqlEndpoint: string;
  webOrigin: string;
  webReferer: string;
  firebaseRefreshTokenEndpoint: string;
}

export const SANTOS_RUNTIME_URLS: Readonly<OnaiRuntimeUrls> = Object.freeze({
  graphqlEndpoint: `https://${SERVICE_HOST_PREFIX}-graphql-auu6epeciq-uc.a.run.app/api`,
  webOrigin: `https://${SERVICE_HOST_PREFIX}.ai`,
  webReferer: `https://${SERVICE_HOST_PREFIX}.ai/`,
  firebaseRefreshTokenEndpoint: "https://securetoken.googleapis.com/v1/token",
});

export type OnaiRuntimeUrlOverrides = Partial<OnaiRuntimeUrls>;

export function resolveOnaiRuntimeUrls(overrides: OnaiRuntimeUrlOverrides = {}): OnaiRuntimeUrls {
  return {
    graphqlEndpoint: overrides.graphqlEndpoint ?? SANTOS_RUNTIME_URLS.graphqlEndpoint,
    webOrigin: overrides.webOrigin ?? SANTOS_RUNTIME_URLS.webOrigin,
    webReferer: overrides.webReferer ?? SANTOS_RUNTIME_URLS.webReferer,
    firebaseRefreshTokenEndpoint:
      overrides.firebaseRefreshTokenEndpoint ?? SANTOS_RUNTIME_URLS.firebaseRefreshTokenEndpoint,
  };
}
