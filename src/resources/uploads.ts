import { OnaiApiError, OnaiValidationError } from "../internal/errors.js";
import { buildStandardRequestHeaders, type ResolvedOnaiRequestHeaders } from "../internal/request-headers.js";
import { SANTOS_RUNTIME_URLS } from "../runtime-config.js";
import type { ProductImageInput } from "./products.js";

export interface UploadsResourceConfig {
  fetch: typeof fetch;
  origin?: string;
  referer?: string;
  headers: ResolvedOnaiRequestHeaders;
}

export interface UploadToSignedUrlInput {
  signedUrl: string;
  contentType: string;
  body: BodyInit;
}

export interface UploadedImage extends Required<ProductImageInput> {
  bucketPath: string;
  fileName: string;
  signedUrl: string;
}

export class UploadsResource {
  private readonly fetch: typeof fetch;
  private readonly origin: string;
  private readonly referer: string;
  private readonly headers: ResolvedOnaiRequestHeaders;

  constructor(config: UploadsResourceConfig) {
    this.fetch = config.fetch;
    this.origin = config.origin ?? SANTOS_RUNTIME_URLS.webOrigin;
    this.referer = config.referer ?? SANTOS_RUNTIME_URLS.webReferer;
    this.headers = config.headers;
  }

  async uploadToSignedUrl(input: UploadToSignedUrlInput): Promise<UploadedImage> {
    const signedUrl = requireNonEmpty(input.signedUrl, "signedUrl");
    const contentType = requireNonEmpty(input.contentType, "contentType");
    const uploadedImage = parseSignedImageUrl(signedUrl);

    const response = await this.fetch(signedUrl, {
      method: "PUT",
      headers: buildStandardRequestHeaders(this.headers, {
        accept: "application/json, text/plain, */*",
        "content-type": contentType,
        origin: this.origin,
        referer: this.referer,
      }),
      body: input.body,
    });

    if (!response.ok) {
      throw new OnaiApiError("Image upload failed.", {
        status: response.status,
        details: {
          reason: "upload_failed",
        },
      });
    }

    return uploadedImage;
  }

  fromSignedUrl(signedUrl: string): UploadedImage {
    return parseSignedImageUrl(signedUrl);
  }
}

function parseSignedImageUrl(signedUrl: string): UploadedImage {
  let url: URL;

  try {
    url = new URL(requireNonEmpty(signedUrl, "signedUrl"));
  } catch {
    throw new OnaiValidationError("signedUrl must be a valid URL.");
  }

  const decodedPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const bucketPrefix = "airpict.appspot.com/";
  const filePath = decodedPath.startsWith(bucketPrefix) ? decodedPath.slice(bucketPrefix.length) : decodedPath;
  const parts = filePath.split("/").filter(Boolean);
  const fileName = parts.at(-1);
  const id = parts.at(-2);

  if (!filePath.startsWith("workspace-assets-uploads/") || !fileName || !id) {
    throw new OnaiValidationError("signedUrl does not point to a Santos workspace asset upload.");
  }

  return {
    type: "file",
    filePath,
    bucketPath: decodedPath,
    id,
    fileName,
    signedUrl,
  };
}

function requireNonEmpty(value: string, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}
