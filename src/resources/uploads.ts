import { OnaiApiError, OnaiValidationError } from "../internal/errors.js";
import type { SantosGraphqlClient } from "../internal/graphql.js";
import type { CustomModelImageInput } from "../internal/custom-models.js";

export type WorkspaceAssetUploadPrivacy = "PRIVATE" | "PUBLIC";
export type WorkspaceAssetUploadResourceType = "CUSTOM_MODEL_TRAINING_UPLOADS";

export interface UploadsResourceConfig {
  graphql: SantosGraphqlClient;
  fetch: typeof fetch;
  workspaceId: string;
}

export interface UploadToSignedUrlInput {
  signedUrl: string;
  contentType: string;
  body: BodyInit;
  uploadHeaders?: Record<string, string>;
}

export interface CreateWorkspaceAssetUploadUrlInput {
  id?: string;
  fileName: string;
  contentType: string;
}

export interface CreateWorkspaceAssetUploadUrlsInput {
  files: CreateWorkspaceAssetUploadUrlInput[];
  workspaceId?: string;
  privacy?: WorkspaceAssetUploadPrivacy;
  resourceType?: WorkspaceAssetUploadResourceType;
}

export interface WorkspaceAssetUploadUrl {
  id: string;
  uploadUrl: string;
  filePath: string;
  uploadHeaders?: Record<string, string> | null;
  publicUrl?: string | null;
  __typename?: string;
}

export interface UploadImageInput {
  id?: string;
  fileName: string;
  contentType: string;
  body: BodyInit;
  workspaceId?: string;
  privacy?: WorkspaceAssetUploadPrivacy;
  resourceType?: WorkspaceAssetUploadResourceType;
}

export interface UploadImagesInput {
  images: UploadImageInput[];
  workspaceId?: string;
  privacy?: WorkspaceAssetUploadPrivacy;
  resourceType?: WorkspaceAssetUploadResourceType;
}

export interface UploadedImage extends Required<CustomModelImageInput> {
  bucketPath: string;
  fileName: string;
  signedUrl?: string;
  publicUrl?: string | null;
}

interface WorkspaceAssetUploadUrlsCreateResponse {
  workspaceAssetUploadUrlsCreate: WorkspaceAssetUploadUrl[];
}

interface NormalizedUploadImage {
  id: string;
  fileName: string;
  contentType: string;
  body: BodyInit;
}

export class UploadsResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly fetch: typeof fetch;
  private readonly workspaceId: string;

  constructor(config: UploadsResourceConfig) {
    this.graphql = config.graphql;
    this.fetch = config.fetch;
    this.workspaceId = config.workspaceId;
  }

  async createSignedUrls(input: CreateWorkspaceAssetUploadUrlsInput): Promise<WorkspaceAssetUploadUrl[]> {
    const files = normalizeUploadFiles(input.files);
    const data = await this.graphql.request<WorkspaceAssetUploadUrlsCreateResponse>({
      operationName: "workspaceAssetUploadUrlsCreate",
      variables: {
        input: {
          workspaceId: requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId"),
          privacy: input.privacy ?? "PRIVATE",
          resourceType: input.resourceType ?? "CUSTOM_MODEL_TRAINING_UPLOADS",
          data: files.map(({ id, fileName, contentType }) => ({
            id,
            fileName,
            contentType,
          })),
        },
      },
      query: WORKSPACE_ASSET_UPLOAD_URLS_CREATE_MUTATION,
    });

    const uploadUrls = data.workspaceAssetUploadUrlsCreate;

    if (!Array.isArray(uploadUrls) || uploadUrls.length !== files.length) {
      throw new OnaiApiError("Santos did not return upload URLs.", {
        details: {
          reason: "missing_upload_urls",
          expected: files.length,
          received: Array.isArray(uploadUrls) ? uploadUrls.length : 0,
        },
      });
    }

    return uploadUrls;
  }

  async uploadImage(input: UploadImageInput): Promise<UploadedImage> {
    const uploadInput: UploadImagesInput = {
      images: [input],
    };

    if (input.workspaceId) {
      uploadInput.workspaceId = input.workspaceId;
    }

    if (input.privacy) {
      uploadInput.privacy = input.privacy;
    }

    if (input.resourceType) {
      uploadInput.resourceType = input.resourceType;
    }

    const uploaded = await this.uploadImages(uploadInput);
    const firstImage = uploaded[0];

    if (!firstImage) {
      throw new OnaiApiError("Santos did not return an uploaded image reference.", {
        details: {
          reason: "missing_uploaded_image",
        },
      });
    }

    return firstImage;
  }

  async uploadImages(input: UploadImagesInput): Promise<UploadedImage[]> {
    const images = normalizeUploadImages(input.images);
    const createInput: CreateWorkspaceAssetUploadUrlsInput = {
      files: images,
    };

    if (input.workspaceId) {
      createInput.workspaceId = input.workspaceId;
    }

    if (input.privacy) {
      createInput.privacy = input.privacy;
    }

    if (input.resourceType) {
      createInput.resourceType = input.resourceType;
    }

    const uploadUrls = await this.createSignedUrls(createInput);

    return Promise.all(
      images.map(async (image, index) => {
        const uploadUrl = uploadUrls[index];

        if (!uploadUrl?.uploadUrl) {
          throw new OnaiApiError("Santos did not return an upload URL for an image.", {
            details: {
              reason: "missing_upload_url",
              index,
            },
          });
        }

        await this.putSignedUpload({
          signedUrl: uploadUrl.uploadUrl,
          contentType: image.contentType,
          body: image.body,
          ...(uploadUrl.uploadHeaders ? { uploadHeaders: uploadUrl.uploadHeaders } : {}),
        });

        return uploadedImageFromUploadUrl(uploadUrl, image);
      }),
    );
  }

  async uploadToSignedUrl(input: UploadToSignedUrlInput): Promise<UploadedImage> {
    const signedUrl = requireNonEmpty(input.signedUrl, "signedUrl");
    const contentType = requireNonEmpty(input.contentType, "contentType");
    const uploadedImage = parseSignedImageUrl(signedUrl);

    await this.putSignedUpload(input.uploadHeaders ? { ...input, signedUrl, contentType } : { signedUrl, contentType, body: input.body });

    return uploadedImage;
  }

  fromSignedUrl(signedUrl: string): UploadedImage {
    return parseSignedImageUrl(signedUrl);
  }

  private async putSignedUpload(input: UploadToSignedUrlInput): Promise<void> {
    const response = await this.fetch(requireNonEmpty(input.signedUrl, "signedUrl"), {
      method: "PUT",
      headers: {
        "Content-Type": requireNonEmpty(input.contentType, "contentType"),
        ...(input.uploadHeaders ?? {}),
      },
      body: input.body,
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");

      throw new OnaiApiError("Image upload failed.", {
        status: response.status,
        details: {
          reason: "upload_failed",
          status: response.status,
          statusText: response.statusText,
          responseHeaders: pickUploadDebugResponseHeaders(response.headers),
          responseBodyPreview: previewBody(responseBody),
        },
      });
    }
  }
}

export function isUploadImageInput(value: unknown): value is UploadImageInput {
  return (
    value !== null &&
    typeof value === "object" &&
    "body" in value &&
    "fileName" in value &&
    "contentType" in value
  );
}

function normalizeUploadImages(images: UploadImageInput[]): NormalizedUploadImage[] {
  if (!Array.isArray(images) || images.length === 0) {
    throw new OnaiValidationError("At least one upload image is required.");
  }

  return images.map((image, index) => ({
    id: requireNonEmpty(image.id ?? createUploadId(), `images[${index}].id`),
    fileName: requireNonEmpty(image.fileName, `images[${index}].fileName`),
    contentType: requireNonEmpty(image.contentType, `images[${index}].contentType`),
    body: image.body,
  }));
}

function normalizeUploadFiles(files: CreateWorkspaceAssetUploadUrlInput[]): CreateWorkspaceAssetUploadUrlInput[] {
  if (!Array.isArray(files) || files.length === 0) {
    throw new OnaiValidationError("At least one upload file is required.");
  }

  return files.map((file, index) => ({
    id: requireNonEmpty(file.id ?? createUploadId(), `files[${index}].id`),
    fileName: requireNonEmpty(file.fileName, `files[${index}].fileName`),
    contentType: requireNonEmpty(file.contentType, `files[${index}].contentType`),
  }));
}

function uploadedImageFromUploadUrl(uploadUrl: WorkspaceAssetUploadUrl, image: NormalizedUploadImage): UploadedImage {
  const filePath = requireNonEmpty(uploadUrl.filePath, "uploadUrl.filePath");

  return {
    type: "file",
    filePath,
    bucketPath: `airpict.appspot.com/${filePath}`,
    id: requireNonEmpty(uploadUrl.id || image.id || inferIdFromFilePath(filePath), "uploadUrl.id"),
    fileName: image.fileName,
    publicUrl: uploadUrl.publicUrl ?? null,
  };
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

function inferIdFromFilePath(filePath: string): string | undefined {
  const parts = filePath.split("/").filter(Boolean);
  return parts.at(-2);
}

function createUploadId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}

function pickUploadDebugResponseHeaders(headers: Headers): Record<string, string> {
  const names = ["content-type", "x-request-id", "x-guploader-uploadid"];

  return Object.fromEntries(
    names
      .map((name) => [name, headers.get(name)] as const)
      .filter((entry): entry is readonly [string, string] => typeof entry[1] === "string" && entry[1].length > 0),
  );
}

function previewBody(rawBody: string): string | undefined {
  const normalized = rawBody.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.length > 2_000 ? `${normalized.slice(0, 2_000)}...` : normalized;
}

const WORKSPACE_ASSET_UPLOAD_URLS_CREATE_MUTATION = `mutation workspaceAssetUploadUrlsCreate($input: WorkspaceAssetUploadUrlsCreateInput!) {
  workspaceAssetUploadUrlsCreate(input: $input) {
    id
    uploadUrl
    filePath
    uploadHeaders
    publicUrl
    __typename
  }
}`;
