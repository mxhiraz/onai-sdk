import { OnaiValidationError } from "./errors.js";

export type OnaiRequestHeaderValue = string | number | boolean | null;
export type OnaiTrackingContext = Record<string, OnaiRequestHeaderValue>;
export type OnaiConsentIntegrations = Record<string, boolean>;

export interface OnaiRequestHeadersConfig {
  autoBrowserHeaders?: boolean | undefined;
  userAgent?: string | undefined;
  acceptLanguage?: string | undefined;
  trackingContext?: OnaiTrackingContext | undefined;
  consentIntegrations?: OnaiConsentIntegrations | undefined;
  additionalHeaders?: Record<string, string> | undefined;
}

export interface ResolvedOnaiRequestHeaders {
  userAgent: string;
  acceptLanguage: string;
  trackingContext: OnaiTrackingContext;
  consentIntegrations?: OnaiConsentIntegrations;
  browserHeaders: Record<string, string>;
  additionalHeaders: Record<string, string>;
}

const DEFAULT_BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36";
const DEFAULT_SERVER_USER_AGENT = "OnAI SDK/0.1.0 (server)";
const DEFAULT_ACCEPT_LANGUAGE = "en-US,en;q=0.9";
const DEFAULT_BROWSER_HEADERS = Object.freeze({
  priority: "u=1, i",
  "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"macOS"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "cross-site",
  "sec-gpc": "1",
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
const HEADER_NAME_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const MANAGED_HEADERS = new Set([
  "accept",
  "accept-language",
  "apollo-require-preflight",
  "authorization",
  "connection",
  "content-length",
  "content-type",
  "cookie",
  "host",
  "origin",
  "referer",
  "user-agent",
  "x-consent-integrations",
  "x-tracking-context",
]);

export function resolveOnaiRequestHeaders(config: OnaiRequestHeadersConfig = {}): ResolvedOnaiRequestHeaders {
  const autoBrowserHeaders = config.autoBrowserHeaders ?? true;
  const resolved: ResolvedOnaiRequestHeaders = {
    userAgent: normalizeHeaderValue(
      config.userAgent ?? (autoBrowserHeaders ? DEFAULT_BROWSER_USER_AGENT : DEFAULT_SERVER_USER_AGENT),
      "headers.userAgent",
    ),
    acceptLanguage: normalizeHeaderValue(
      config.acceptLanguage ?? DEFAULT_ACCEPT_LANGUAGE,
      "headers.acceptLanguage",
    ),
    trackingContext: normalizeTrackingContext(config.trackingContext),
    browserHeaders: autoBrowserHeaders ? { ...DEFAULT_BROWSER_HEADERS } : {},
    additionalHeaders: normalizeAdditionalHeaders(config.additionalHeaders),
  };

  if (autoBrowserHeaders || config.consentIntegrations) {
    resolved.consentIntegrations = normalizeConsentIntegrations({
      ...(autoBrowserHeaders ? DEFAULT_CONSENT_INTEGRATIONS : {}),
      ...config.consentIntegrations,
    });
  }

  return resolved;
}

export function buildTrackingContextHeaders(
  workspaceId: string,
  requestHeaders: ResolvedOnaiRequestHeaders,
  webOrigin: string,
): Record<string, string> {
  const headers: Record<string, string> = {
    "x-tracking-context": JSON.stringify({
      platform: "web",
      url: defaultTrackingUrl(webOrigin),
      ...requestHeaders.trackingContext,
      workspaceId,
      g_workspace_id: workspaceId,
    }),
  };

  if (requestHeaders.consentIntegrations) {
    headers["x-consent-integrations"] = JSON.stringify(requestHeaders.consentIntegrations);
  }

  return headers;
}

export function buildStandardRequestHeaders(
  requestHeaders: ResolvedOnaiRequestHeaders,
  baseHeaders: Record<string, string>,
): Record<string, string> {
  return {
    ...baseHeaders,
    "accept-language": requestHeaders.acceptLanguage,
    "user-agent": requestHeaders.userAgent,
    ...requestHeaders.browserHeaders,
    ...requestHeaders.additionalHeaders,
  };
}

function normalizeTrackingContext(context: OnaiTrackingContext | undefined): OnaiTrackingContext {
  if (!context) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => {
      if (!isTrackingContextValue(value)) {
        throw new OnaiValidationError(`headers.trackingContext.${key} must be a string, number, boolean, or null.`);
      }

      return [key, value];
    }),
  );
}

function normalizeConsentIntegrations(consent: OnaiConsentIntegrations): OnaiConsentIntegrations {
  return Object.fromEntries(
    Object.entries(consent).map(([key, value]) => {
      if (typeof value !== "boolean") {
        throw new OnaiValidationError(`headers.consentIntegrations.${key} must be a boolean.`);
      }

      return [key, value];
    }),
  );
}

function normalizeAdditionalHeaders(headers: Record<string, string> | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => {
      const normalizedName = normalizeHeaderName(name);

      return [normalizedName, normalizeHeaderValue(value, `headers.additionalHeaders.${name}`)];
    }),
  );
}

function normalizeHeaderName(name: string): string {
  const normalizedName = name.trim().toLowerCase();

  if (!HEADER_NAME_PATTERN.test(normalizedName)) {
    throw new OnaiValidationError(`headers.additionalHeaders.${name} is not a valid header name.`);
  }

  if (MANAGED_HEADERS.has(normalizedName) || normalizedName.startsWith("sec-") || normalizedName === "priority") {
    throw new OnaiValidationError(`headers.additionalHeaders.${name} is managed by the SDK.`);
  }

  return normalizedName;
}

function normalizeHeaderValue(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} must be a non-empty string.`);
  }

  if (/[\r\n]/.test(value)) {
    throw new OnaiValidationError(`${field} must not contain newline characters.`);
  }

  return value.trim();
}

function defaultTrackingUrl(webOrigin: string): string {
  return `${webOrigin.replace(/\/+$/, "")}/generate-image`;
}

function isTrackingContextValue(value: unknown): value is OnaiRequestHeaderValue {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}
