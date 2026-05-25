type RequestHeaderValue = string | number | boolean | null;
type TrackingContext = Record<string, RequestHeaderValue>;
type ConsentIntegrations = Record<string, boolean>;

export interface ResolvedOnaiRequestHeaders {
  userAgent: string;
  trackingContext: TrackingContext;
  consentIntegrations: ConsentIntegrations;
  browserHeaders: Record<string, string>;
}

const DEFAULT_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
const DEFAULT_BROWSER_HEADERS = Object.freeze({
  "Sec-GPC": "1",
  "sec-ch-ua-platform": '"macOS"',
  "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
});
const DEFAULT_CONSENT_INTEGRATIONS = Object.freeze({
  All: false,
  "Facebook Conversions API (Actions)": true,
  "Twitter Ads": true,
  "Facebook Pixel": true,
  "Google AdWords New": true,
  "LinkedIn Conversions API": true,
  "LinkedIn Insight Tag": true,
  "TikTok Conversions": true,
  "Pinterest Conversions API": true,
  "Pinterest Tag": true,
  "Google Enhanced Conversions": true,
  "Google Tag Manager": true,
  "Actions Google Analytic 4": true,
  Intercom: true,
  Mixpanel: true,
  "Actions Customerio": true,
  FullStory: true,
  "Dub (Actions)": true,
});

export function resolveOnaiRequestHeaders(): ResolvedOnaiRequestHeaders {
  return {
    userAgent: DEFAULT_BROWSER_USER_AGENT,
    trackingContext: {},
    consentIntegrations: { ...DEFAULT_CONSENT_INTEGRATIONS },
    browserHeaders: { ...DEFAULT_BROWSER_HEADERS },
  };
}

export function buildTrackingContextHeaders(
  workspaceId: string,
  requestHeaders: ResolvedOnaiRequestHeaders,
  webOrigin: string,
): Record<string, string> {
  return {
    "x-tracking-context": JSON.stringify({
      platform: "web",
      url: defaultTrackingUrl(webOrigin),
      ...requestHeaders.trackingContext,
      workspaceId,
      g_workspace_id: workspaceId,
      fbp: "fb.1.1775284887196.738488026136559361",
    }),
    "x-consent-integrations": JSON.stringify(requestHeaders.consentIntegrations),
  };
}

export function buildStandardRequestHeaders(
  requestHeaders: ResolvedOnaiRequestHeaders,
  baseHeaders: Record<string, string>,
): Record<string, string> {
  return {
    ...baseHeaders,
    "User-Agent": requestHeaders.userAgent,
    ...requestHeaders.browserHeaders,
  };
}

function defaultTrackingUrl(webOrigin: string): string {
  return `${webOrigin.replace(/\/+$/, "")}/cloey-santos`;
}
