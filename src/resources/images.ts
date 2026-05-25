import type { CustomModel, CustomModelType } from "../internal/custom-models.js";
import { OnaiApiError, OnaiValidationError } from "../internal/errors.js";
import type { SantosGraphqlClient } from "../internal/graphql.js";

export type ImageGenerationAssetType = "IMAGE" | "VIDEO";
export enum ImageGenerationMode {
  Default = "default",
  Max = "max",
  Premium = "premium",
}

export enum ImageGenerationAspectRatio {
  Portrait9x16 = "9:16",
  Portrait2x3 = "2:3",
  Portrait3x4 = "3:4",
  Portrait4x5 = "4:5",
  Square = "1:1",
  Landscape5x4 = "5:4",
  Landscape4x3 = "4:3",
  Landscape3x2 = "3:2",
  Landscape16x9 = "16:9",
  Ultrawide21x9 = "21:9",
}

export enum ImageGenerationVersion {
  Images1 = 1,
  Images2 = 2,
  Images4 = 4,
}

/** @beta Use through onai.beta.videos. */
export enum VideoGenerationAspectRatio {
  Landscape16x9 = "16:9",
  Square = "1:1",
  Portrait9x16 = "9:16",
}

/** @beta Use through onai.beta.videos. */
export enum VideoGenerationDuration {
  Seconds4 = 4,
  Seconds5 = 5,
  Seconds6 = 6,
  Seconds7 = 7,
  Seconds8 = 8,
  Seconds9 = 9,
  Seconds10 = 10,
  Seconds11 = 11,
  Seconds12 = 12,
  Seconds13 = 13,
  Seconds14 = 14,
  Seconds15 = 15,
}

/** @beta Use through onai.beta.videos. */
export enum VideoGenerationSound {
  Off = "off",
  On = "on",
}

/** @beta Use through onai.beta.videos. */
export enum VideoGenerationCameraMotion {
  Auto = "AUTO",
}

export type GenerationAspectRatio = ImageGenerationAspectRatio | VideoGenerationAspectRatio;

export interface ImageGenerationModelConfig {
  id: string;
  imageUrl: string;
  modelType: CustomModelType;
}

export interface ImageGenerationControlImage {
  imageUrl: string;
  maskedControlImageUrl?: string;
  objectSize?: SizeInput;
  objectPosition?: PointInput;
  objectRotation?: number;
}

export interface SizeInput {
  width: number;
  height: number;
}

export interface PointInput {
  x: number;
  y: number;
}

/** @beta Use through onai.beta.videos. */
export interface BetaVideoOptionsInput {
  startFrameUrl?: string;
  endFrameUrl?: string;
  cameraMotion?: VideoGenerationCameraMotion | string;
  duration?: VideoGenerationDuration;
  withAudio?: boolean;
}

/** @beta Use through onai.beta.videos. */
export interface GenerateBetaVideoInput extends Omit<GenerateImageInput, "aspectRatio" | "samples"> {
  aspectRatio?: VideoGenerationAspectRatio;
  duration?: VideoGenerationDuration;
  sound?: VideoGenerationSound;
  videoOptions?: BetaVideoOptionsInput;
}

export interface GenerateImageInput {
  prompt: string;
  workspaceId?: string;
  aspectRatio?: GenerationAspectRatio;
  styleUrls?: string[];
  mode?: ImageGenerationMode;
  models?: ImageGenerationModelConfig[];
  customModelsConfig?: ImageGenerationModelConfig[];
  controlImage?: ImageGenerationControlImage;
  controlImages?: ImageGenerationControlImage[] | null;
  canvasSize?: SizeInput;
  objectControlMode?: string;
  studioIds?: string[];
  samples?: ImageGenerationVersion;
  maxRes?: boolean;
  bulkGenerationId?: string;
}

export interface ImageCooldownStatusInput {
  workspaceId?: string;
}

export interface ListImageGenerationsInput {
  workspaceId?: string;
  id?: string;
  status?: string;
  assetType?: ImageGenerationAssetType;
  cursor?: string | null;
  limit?: number;
  maxPages?: number;
}

export interface GetImageGenerationInput {
  workspaceId?: string;
}

export interface WaitForImageGenerationInput extends GetImageGenerationInput {
  intervalMs?: number;
  timeoutMs?: number;
  targetStatus?: string;
  terminalStatuses?: string[];
}

export interface ImageGenerationsPageInfo {
  nextCursor: string | null;
  __typename?: string;
}

export interface ImageGenerationsPage {
  pageInfo: ImageGenerationsPageInfo;
  imageGenerations: ImageGeneration[];
  __typename?: string;
}

export interface UserFreeImageCooldownStatus {
  isEligible: boolean;
  cooldownEndsAt: string | null;
  __typename?: string;
}

export interface ImageGeneration {
  id: string;
  promptRaw?: string;
  promptDisplay?: string;
  status: string;
  statusMessage?: string | null;
  retryable?: boolean;
  workspaceId: string;
  output?: ImageGenerationOutput[];
  originalImageUrl?: string | null;
  originalImageUrls?: string[];
  options?: ImageGenerationOptions;
  aspectRatio?: string | null;
  styleImageUrls?: string[];
  createdAt?: string;
  updatedAt?: string;
  objectControlMode?: string | null;
  customModelConfigs?: ImageGenerationCustomModelConfig[];
  controlImages?: ImageGenerationControlImage[] | null;
  assetType?: ImageGenerationAssetType;
  studioIds?: string[];
  studio?: StudioListItem | null;
  deleted?: boolean;
  sourceTaskId?: string | null;
  taskId?: string | null;
  bulkGenerationId?: string | null;
  createdBy?: ImageGenerationUser | null;
  __typename?: string;
}

export interface ImageGenerationOutput {
  id: string;
  seed?: string | number | null;
  url?: string | null;
  originalUrl?: string | null;
  thumbnailUrl?: string | null;
  durationMs?: number | null;
  displayModelName?: string | null;
  optimizedPrompt?: string | null;
  mlOptimizerName?: string | null;
  startFrameUrl?: string | null;
  startFrameOptimizedPrompt?: string | null;
  deleted?: boolean;
  deletedAt?: string | null;
  studio?: StudioListItem | null;
  __typename?: string;
}

export interface ImageGenerationOptions {
  samples?: number | null;
  maxRes?: boolean | null;
  mode?: string | null;
  studioIds?: string[] | null;
  videoOptions?: BetaVideoOptionsInput | null;
  canvasSize?: SizeInput | null;
  __typename?: string;
}

export interface ImageGenerationCustomModelConfig {
  customModel?: Pick<
    CustomModel,
    | "id"
    | "modelName"
    | "modelType"
    | "thumbUrl"
    | "category"
    | "subcategory"
    | "ignoreFeedback"
    | "canonicalNameSetByUser"
    | "sizeSetByUser"
    | "userFeedback"
    | "enrichmentMetadata"
    | "imageOptions"
  >;
  imageUrl?: string;
  warningSnapshot?: {
    hadWarnings?: boolean;
    __typename?: string;
  };
  __typename?: string;
}

export interface StudioListItem {
  id: string;
  name?: string;
  published?: boolean;
  thumbnails?: Array<{ url: string; __typename?: string }>;
  workspaceId?: string;
  type?: string;
  createdAt?: string;
  usageCount?: number;
  isProductShotTemplate?: boolean;
  remixedFromStudioId?: string | null;
  bestForCategories?: string[];
  bestForSizes?: string[];
  bestForSubcategories?: string[];
  shotNewSubcategories?: string[];
  __typename?: string;
}

export interface ImageGenerationUser {
  id: string;
  uid?: string;
  email?: string;
  displayName?: string | null;
  firstName?: string | null;
  photoURL?: string | null;
  handle?: string | null;
  __typename?: string;
}

interface ImagesResourceConfig {
  graphql: SantosGraphqlClient;
  workspaceId: string;
}

interface ImageGenerationCreateResponse {
  imageGenerationCreate: ImageGeneration;
}

interface ImageGenerationsResponse {
  imageGenerations: ImageGenerationsPage;
}

interface UserFreeImageCooldownStatusResponse {
  userFreeImageCooldownStatus: UserFreeImageCooldownStatus;
}

interface CreateGenerationRequest {
  graphql: SantosGraphqlClient;
  defaultWorkspaceId: string;
  input: GenerateImageInput | GenerateBetaVideoInput;
  assetType: ImageGenerationAssetType;
  aspectRatio?: GenerationAspectRatio | undefined;
  samples?: ImageGenerationVersion | undefined;
  videoOptions?: BetaVideoOptionsInput | undefined;
}

export class ImagesResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly workspaceId: string;

  constructor(config: ImagesResourceConfig) {
    this.graphql = config.graphql;
    this.workspaceId = config.workspaceId;
  }

  async generate(input: GenerateImageInput): Promise<ImageGeneration> {
    return createGeneration({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      input,
      assetType: "IMAGE",
      aspectRatio: input.aspectRatio,
      samples: input.samples,
    });
  }

  create(input: GenerateImageInput): Promise<ImageGeneration> {
    return this.generate(input);
  }

  async list(input: ListImageGenerationsInput = {}): Promise<ImageGeneration[]> {
    return listAllGenerations({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async listPage(input: ListImageGenerationsInput = {}): Promise<ImageGenerationsPage> {
    return listGenerationPage({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async get(id: string, input: GetImageGenerationInput = {}): Promise<ImageGeneration | null> {
    return getGeneration({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async waitFor(id: string, input: WaitForImageGenerationInput = {}): Promise<ImageGeneration> {
    return waitForGeneration({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async cooldownStatus(input: ImageCooldownStatusInput = {}): Promise<UserFreeImageCooldownStatus> {
    return this.freeImageCooldownStatus(input);
  }

  async freeImageCooldownStatus(input: ImageCooldownStatusInput = {}): Promise<UserFreeImageCooldownStatus> {
    const workspaceId = requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId");

    const data = await this.graphql.request<UserFreeImageCooldownStatusResponse>({
      operationName: "userFreeImageCooldownStatus",
      variables: {
        workspaceId,
      },
      query: USER_FREE_IMAGE_COOLDOWN_STATUS_QUERY,
    });

    return data.userFreeImageCooldownStatus;
  }

  modelConfig(model: CustomModel, imageUrl?: string): ImageGenerationModelConfig {
    const resolvedImageUrl = imageUrl ?? model.imageOptions?.[0]?.url ?? model.thumbUrl;

    if (!resolvedImageUrl) {
      throw new OnaiValidationError("A model imageUrl is required for generation.");
    }

    return {
      id: model.id,
      imageUrl: resolvedImageUrl,
      modelType: model.modelType,
    };
  }

  mention(model: Pick<CustomModel, "id" | "modelName">, label = model.modelName): string {
    return `@[${requireNonEmpty(label, "label")}](${requireNonEmpty(model.id, "model.id")})`;
  }
}

/** @beta Use through onai.beta.videos. */
export class BetaVideosResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly workspaceId: string;

  constructor(config: ImagesResourceConfig) {
    this.graphql = config.graphql;
    this.workspaceId = config.workspaceId;
  }

  generate(input: GenerateBetaVideoInput): Promise<ImageGeneration> {
    return createGeneration({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      input,
      assetType: "VIDEO",
      aspectRatio: input.aspectRatio ?? VideoGenerationAspectRatio.Landscape16x9,
      samples: ImageGenerationVersion.Images1,
      videoOptions: normalizeBetaVideoOptions(input),
    });
  }

  create(input: GenerateBetaVideoInput): Promise<ImageGeneration> {
    return this.generate(input);
  }

  async list(input: ListImageGenerationsInput = {}): Promise<ImageGeneration[]> {
    return listAllGenerations({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  async listPage(input: ListImageGenerationsInput = {}): Promise<ImageGenerationsPage> {
    return listGenerationPage({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  async get(id: string, input: GetImageGenerationInput = {}): Promise<ImageGeneration | null> {
    return getGeneration({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  async waitFor(id: string, input: WaitForImageGenerationInput = {}): Promise<ImageGeneration> {
    return waitForGeneration({
      graphql: this.graphql,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  modelConfig(model: CustomModel, imageUrl?: string): ImageGenerationModelConfig {
    const resolvedImageUrl = imageUrl ?? model.imageOptions?.[0]?.url ?? model.thumbUrl;

    if (!resolvedImageUrl) {
      throw new OnaiValidationError("A model imageUrl is required for generation.");
    }

    return {
      id: model.id,
      imageUrl: resolvedImageUrl,
      modelType: model.modelType,
    };
  }

  mention(model: Pick<CustomModel, "id" | "modelName">, label = model.modelName): string {
    return `@[${requireNonEmpty(label, "label")}](${requireNonEmpty(model.id, "model.id")})`;
  }
}

async function createGeneration(request: CreateGenerationRequest): Promise<ImageGeneration> {
  const input = request.input;
  const workspaceId = requireNonEmpty(input.workspaceId ?? request.defaultWorkspaceId, "workspaceId");
  const customModelsConfig = input.customModelsConfig ?? input.models ?? [];

  const data = await request.graphql.request<ImageGenerationCreateResponse>({
    operationName: "imageGenerationCreate",
    variables: {
      workspaceId,
      prompt: requireNonEmpty(input.prompt, "prompt"),
      aspectRatio: request.aspectRatio,
      styleUrls: input.styleUrls ?? [],
      mode: input.mode ?? ImageGenerationMode.Default,
      customModelsConfig: customModelsConfig.map(normalizeModelConfig),
      controlImage: input.controlImage,
      controlImages: input.controlImages,
      canvasSize: input.canvasSize,
      objectControlMode: input.objectControlMode,
      assetType: request.assetType,
      videoOptions: request.videoOptions,
      studioIds: input.studioIds ?? [],
      samples: request.samples ?? ImageGenerationVersion.Images1,
      maxRes: input.maxRes,
      bulkGenerationId: input.bulkGenerationId,
    },
    query: IMAGE_GENERATION_CREATE_MUTATION,
  });

  return normalizeGenerationOutput(data.imageGenerationCreate);
}

interface GenerationLookupRequest<TInput extends GetImageGenerationInput | WaitForImageGenerationInput> {
  graphql: SantosGraphqlClient;
  defaultWorkspaceId: string;
  id: string;
  input: TInput;
  forcedAssetType?: ImageGenerationAssetType | undefined;
}

interface ListGenerationsRequest {
  graphql: SantosGraphqlClient;
  defaultWorkspaceId: string;
  input: ListImageGenerationsInput;
  forcedAssetType?: ImageGenerationAssetType | undefined;
}

async function listGenerationPage(request: ListGenerationsRequest): Promise<ImageGenerationsPage> {
  const input = request.input;
  const workspaceId = requireNonEmpty(input.workspaceId ?? request.defaultWorkspaceId, "workspaceId");

  const data = await request.graphql.request<ImageGenerationsResponse>({
    operationName: "imageGenerations",
    variables: {
      workspaceId,
      first: normalizePositiveInteger(input.limit ?? 20, "limit"),
      cursor: input.cursor ?? null,
    },
    query: IMAGE_GENERATIONS_QUERY,
  });

  return filterGenerationsPage(data.imageGenerations, input, request.forcedAssetType);
}

async function listAllGenerations(request: ListGenerationsRequest): Promise<ImageGeneration[]> {
  const input = request.input;
  const limit = input.limit === undefined ? undefined : normalizePositiveInteger(input.limit, "limit");
  const maxPages = normalizePositiveInteger(input.maxPages ?? 50, "maxPages");
  const imageGenerations: ImageGeneration[] = [];
  let cursor = input.cursor ?? null;
  let pageCount = 0;

  do {
    pageCount += 1;
    const pageInput: ListImageGenerationsInput = {
      ...input,
      cursor,
    };

    delete pageInput.limit;

    const page = await listGenerationPage({
      ...request,
      input: pageInput,
    });

    imageGenerations.push(...page.imageGenerations);

    if (limit !== undefined && imageGenerations.length >= limit) {
      return imageGenerations.slice(0, limit);
    }

    cursor = page.pageInfo.nextCursor;
  } while (cursor && pageCount < maxPages);

  return limit === undefined ? imageGenerations : imageGenerations.slice(0, limit);
}

async function getGeneration(
  request: GenerationLookupRequest<GetImageGenerationInput>,
): Promise<ImageGeneration | null> {
  const imageGenerations = await listAllGenerations({
    graphql: request.graphql,
    defaultWorkspaceId: request.defaultWorkspaceId,
    input: generationLookupInput(request),
    forcedAssetType: request.forcedAssetType,
  });

  return imageGenerations[0] ?? null;
}

async function waitForGeneration(
  request: GenerationLookupRequest<WaitForImageGenerationInput>,
): Promise<ImageGeneration> {
  const id = requireNonEmpty(request.id, "id");
  const targetStatus = request.input.targetStatus ?? "READY";
  const terminalStatuses = new Set(request.input.terminalStatuses ?? ["FAILED", "ERROR", "CANCELED", "CANCELLED"]);
  const timeoutMs = normalizePositiveNumber(request.input.timeoutMs ?? 180_000, "timeoutMs");
  const intervalMs = normalizePositiveNumber(request.input.intervalMs ?? 3_000, "intervalMs");
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const generation = await getGeneration({
      graphql: request.graphql,
      defaultWorkspaceId: request.defaultWorkspaceId,
      id,
      input: request.input,
      forcedAssetType: request.forcedAssetType,
    });

    if (generation?.status === targetStatus) {
      return generation;
    }

    if (generation && terminalStatuses.has(generation.status)) {
      throw new OnaiApiError("Generation did not complete.", {
        details: {
          generationId: id,
          status: generation.status,
        },
      });
    }

    await sleep(intervalMs);
  }

  throw new OnaiApiError("Timed out waiting for generation.", {
    details: {
      generationId: id,
      timeoutMs,
    },
  });
}

function generationLookupInput(
  request: GenerationLookupRequest<GetImageGenerationInput | WaitForImageGenerationInput>,
): ListImageGenerationsInput {
  const input: ListImageGenerationsInput = {
    id: requireNonEmpty(request.id, "id"),
    limit: 1,
  };

  if (request.input.workspaceId) {
    input.workspaceId = request.input.workspaceId;
  }

  return input;
}

function filterGenerationsPage(
  page: ImageGenerationsPage,
  input: ListImageGenerationsInput,
  forcedAssetType?: ImageGenerationAssetType,
): ImageGenerationsPage {
  const assetType = forcedAssetType ?? input.assetType;
  const limit = input.limit === undefined ? undefined : normalizePositiveInteger(input.limit, "limit");

  let imageGenerations = page.imageGenerations.map(normalizeGenerationOutput);

  if (input.id) {
    imageGenerations = imageGenerations.filter((generation) => generation.id === input.id);
  }

  if (input.status) {
    imageGenerations = imageGenerations.filter((generation) => generation.status === input.status);
  }

  if (assetType) {
    imageGenerations = imageGenerations.filter((generation) => generation.assetType === assetType);
  }

  if (limit !== undefined) {
    imageGenerations = imageGenerations.slice(0, limit);
  }

  return {
    ...page,
    imageGenerations,
  };
}

function normalizeGenerationOutput(generation: ImageGeneration): ImageGeneration {
  const originalImageUrls =
    generation.output
      ?.map((output) => output.originalUrl ?? output.url)
      .filter((url): url is string => typeof url === "string" && url.length > 0) ?? [];

  return {
    ...generation,
    originalImageUrl: originalImageUrls[0] ?? null,
    originalImageUrls,
  };
}

function normalizeBetaVideoOptions(input: GenerateBetaVideoInput): BetaVideoOptionsInput {
  return {
    ...input.videoOptions,
    cameraMotion: input.videoOptions?.cameraMotion ?? VideoGenerationCameraMotion.Auto,
    duration: input.videoOptions?.duration ?? input.duration ?? VideoGenerationDuration.Seconds5,
    withAudio: input.videoOptions?.withAudio ?? input.sound === VideoGenerationSound.On,
  };
}

function normalizeModelConfig(model: ImageGenerationModelConfig): ImageGenerationModelConfig {
  if (model.modelType !== "CHARACTER" && model.modelType !== "OBJECT") {
    throw new OnaiValidationError("models[].modelType must be CHARACTER or OBJECT.");
  }

  return {
    id: requireNonEmpty(model.id, "models[].id"),
    imageUrl: requireNonEmpty(model.imageUrl, "models[].imageUrl"),
    modelType: model.modelType,
  };
}

function requireNonEmpty(value: string | null | undefined, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}

function normalizePositiveNumber(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new OnaiValidationError(`${field} must be a positive number.`);
  }

  return value;
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new OnaiValidationError(`${field} must be a positive integer.`);
  }

  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const USER_FREE_IMAGE_COOLDOWN_STATUS_QUERY = `query userFreeImageCooldownStatus($workspaceId: String!) {
  userFreeImageCooldownStatus(input: {workspaceId: $workspaceId}) {
    isEligible
    cooldownEndsAt
    __typename
  }
}`;

const IMAGE_GENERATION_CREATE_MUTATION = `mutation imageGenerationCreate($prompt: String!, $workspaceId: String!, $aspectRatio: String, $styleUrls: [String!], $mode: String, $customModelsConfig: [CustomModelConfigInput!], $controlImage: ImageGenerationControlImageInput, $controlImages: [ImageGenerationControlImageInput!], $canvasSize: SizeInput, $objectControlMode: String, $assetType: AssetType, $videoOptions: VideoOptionsInput, $studioIds: [String!], $samples: Int, $maxRes: Boolean, $bulkGenerationId: String) {
  imageGenerationCreate(
    input: {prompt: $prompt, workspaceId: $workspaceId, aspectRatio: $aspectRatio, styleUrls: $styleUrls, mode: $mode, customModelsConfig: $customModelsConfig, controlImage: $controlImage, controlImages: $controlImages, canvasSize: $canvasSize, objectControlMode: $objectControlMode, assetType: $assetType, videoOptions: $videoOptions, studioIds: $studioIds, samples: $samples, maxRes: $maxRes, bulkGenerationId: $bulkGenerationId}
  ) {
    ...ImageGenerationFields
    __typename
  }
}

fragment ImageGenerationFields on ImageGeneration {
  id
  promptRaw
  promptDisplay
  status
  statusMessage
  retryable
  workspaceId
  output {
    id
    seed
    url
    originalUrl
    thumbnailUrl
    durationMs
    displayModelName
    optimizedPrompt
    mlOptimizerName
    startFrameUrl
    startFrameOptimizedPrompt
    deleted
    deletedAt
    studio {
      ...StudioListFields
      __typename
    }
    __typename
  }
  options {
    samples
    maxRes
    mode
    studioIds
    videoOptions {
      startFrameUrl
      endFrameUrl
      cameraMotion
      duration
      withAudio
      __typename
    }
    canvasSize {
      width
      height
      __typename
    }
    __typename
  }
  aspectRatio
  styleImageUrls
  createdAt
  updatedAt
  objectControlMode
  customModelConfigs {
    customModel {
      id
      modelName
      modelType
      thumbUrl
      category
      subcategory
      ignoreFeedback
      canonicalNameSetByUser
      sizeSetByUser
      userFeedback {
        warning {
          key
          message
          __typename
        }
        __typename
      }
      enrichmentMetadata {
        isAmbiguousSubject
        isAmbiguousSize
        __typename
      }
      imageOptions {
        url
        __typename
      }
      __typename
    }
    imageUrl
    warningSnapshot {
      hadWarnings
      __typename
    }
    __typename
  }
  controlImages {
    imageUrl
    maskedControlImageUrl
    objectSize {
      width
      height
      __typename
    }
    objectPosition {
      x
      y
      __typename
    }
    objectRotation
    __typename
  }
  assetType
  studioIds
  studio {
    ...StudioListFields
    __typename
  }
  deleted
  sourceTaskId
  taskId
  bulkGenerationId
  createdBy {
    id
    uid
    email
    displayName
    firstName
    photoURL
    handle
    __typename
  }
  __typename
}

fragment StudioListFields on Studio {
  id
  name
  published
  thumbnails {
    ...StudioThumbnailFields
    __typename
  }
  workspaceId
  type
  createdAt
  usageCount
  isProductShotTemplate
  remixedFromStudioId
  bestForCategories
  bestForSizes
  bestForSubcategories
  shotNewSubcategories
  __typename
}

fragment StudioThumbnailFields on StudioThumbnail {
  url
  __typename
}`;

const IMAGE_GENERATIONS_QUERY = `query imageGenerations($workspaceId: String!, $first: Int!, $cursor: String) {
  imageGenerations(input: {workspaceId: $workspaceId, first: $first, cursor: $cursor}) {
    pageInfo {
      nextCursor
      __typename
    }
    imageGenerations {
      id
      promptRaw
      promptDisplay
      status
      statusMessage
      retryable
      workspaceId
      output {
        id
        seed
        url
        originalUrl
        thumbnailUrl
        durationMs
        displayModelName
        optimizedPrompt
        mlOptimizerName
        startFrameUrl
        startFrameOptimizedPrompt
        deleted
        deletedAt
        __typename
      }
      options {
        samples
        maxRes
        mode
        studioIds
        videoOptions {
          startFrameUrl
          endFrameUrl
          cameraMotion
          duration
          withAudio
          __typename
        }
        canvasSize {
          width
          height
          __typename
        }
        __typename
      }
      aspectRatio
      styleImageUrls
      createdAt
      updatedAt
      objectControlMode
      controlImages {
        imageUrl
        maskedControlImageUrl
        objectSize {
          width
          height
          __typename
        }
        objectPosition {
          x
          y
          __typename
        }
        objectRotation
        __typename
      }
      assetType
      studioIds
      deleted
      sourceTaskId
      taskId
      bulkGenerationId
      createdBy {
        id
        uid
        email
        displayName
        firstName
        photoURL
        handle
        __typename
      }
      __typename
    }
    __typename
  }
}`;
