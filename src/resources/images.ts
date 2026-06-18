import { randomUUID } from "node:crypto";

import type { CustomModel, CustomModelType } from "../internal/custom-models.js";
import { OnaiApiError, OnaiValidationError } from "../internal/errors.js";
import type { SantosGraphqlClient } from "../internal/graphql.js";
import type { ResolvedOnaiLogger } from "../internal/logger.js";
import type { StudioListItem } from "./studios.js";

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
  modelName?: string;
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
  models?: ImageGenerationModelConfigInput[];
  customModelsConfig?: ImageGenerationModelConfigInput[];
  customModelConfigs?: ImageGenerationModelConfigInput[];
  controlImage?: ImageGenerationControlImage;
  controlImages?: ImageGenerationControlImage[] | null;
  canvasSize?: SizeInput;
  objectControlMode?: string;
  studioIds?: string[];
  samples?: ImageGenerationVersion;
  maxRes?: boolean;
  bulkGenerationId?: string;
}

export interface BulkImageGenerationRowInput {
  productModelIds?: string[];
  characterModelIds?: string[];
}

export interface GenerateBulkImagesInput {
  prompt: string;
  workspaceId?: string;
  aspectRatio?: ImageGenerationAspectRatio;
  mode?: ImageGenerationMode;
  samples?: ImageGenerationVersion;
  maxRes?: boolean;
  bulkGenerationId?: string;
  rows: BulkImageGenerationRowInput[];
}

export interface BulkImageGenerationResult {
  bulkGenerationId: string;
  imageGenerations: ImageGeneration[];
  __typename?: string;
}

export interface ImageCooldownStatusInput {
  workspaceId?: string;
}

export interface ListImageGenerationsInput {
  workspaceId?: string;
  id?: string;
  ids?: string[];
  status?: string;
  assetType?: ImageGenerationAssetType;
  bulkGenerationId?: string;
  cursor?: string | null;
  limit?: number;
  pageSize?: number;
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

export interface WaitForBatchImageGenerationsInput extends WaitForImageGenerationInput {
  concurrency?: number;
  onProgress?: (id: string, generation: ImageGeneration) => void | Promise<void>;
  onReady?: (id: string, generation: ImageGeneration) => void | Promise<void>;
  onFail?: (id: string, reason: string, generation: ImageGeneration) => void | Promise<void>;
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
  /** Canonical prompt. Prefers promptRaw so model mention IDs are preserved. */
  prompt?: string;
  promptRaw?: string;
  /** Human-readable UI prompt. Model mentions may be simplified to @name. */
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

export type ImageGenerationModelConfigSource = CustomModel | ImageGenerationCustomModelConfig;
export type ImageGenerationModelConfigInput = ImageGenerationModelConfig | ImageGenerationModelConfigSource;

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
  logger: ResolvedOnaiLogger;
}

interface ImageGenerationCreateResponse {
  imageGenerationCreate: ImageGeneration;
}

interface ImageGenerationBulkCreateResponse {
  imageGenerationBulkCreate: BulkImageGenerationResult;
}

interface ImageGenerationResponse {
  imageGeneration: ImageGeneration | null;
}

interface ImageGenerationsResponse {
  imageGenerations: ImageGenerationsPage;
}

interface UserFreeImageCooldownStatusResponse {
  userFreeImageCooldownStatus: UserFreeImageCooldownStatus;
}

interface CreateGenerationRequest {
  graphql: SantosGraphqlClient;
  logger: ResolvedOnaiLogger;
  defaultWorkspaceId: string;
  input: GenerateImageInput | GenerateBetaVideoInput;
  assetType: ImageGenerationAssetType;
  aspectRatio?: GenerationAspectRatio | undefined;
  samples?: ImageGenerationVersion | undefined;
  videoOptions?: BetaVideoOptionsInput | undefined;
}

interface BulkCreateGenerationsRequest {
  graphql: SantosGraphqlClient;
  logger: ResolvedOnaiLogger;
  defaultWorkspaceId: string;
  input: GenerateBulkImagesInput;
}

export class ImagesResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly workspaceId: string;
  private readonly logger: ResolvedOnaiLogger;

  constructor(config: ImagesResourceConfig) {
    this.graphql = config.graphql;
    this.workspaceId = config.workspaceId;
    this.logger = config.logger;
  }

  async generate(input: GenerateImageInput): Promise<ImageGeneration> {
    return createGeneration({
      graphql: this.graphql,
      logger: this.logger,
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

  async bulkGenerate(input: GenerateBulkImagesInput): Promise<BulkImageGenerationResult> {
    return bulkCreateGenerations({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      input,
    });
  }

  async bulkGenerateAndWait(
    input: GenerateBulkImagesInput,
    waitInput: WaitForBatchImageGenerationsInput = {},
  ): Promise<BulkImageGenerationResult> {
    const result = await this.bulkGenerate(input);
    const completedGenerations = await this.waitForBatch(
      result.imageGenerations.map((generation) => generation.id),
      waitInput,
    );

    return {
      ...result,
      imageGenerations: result.imageGenerations.map(
        (generation) => completedGenerations.get(generation.id) ?? generation,
      ),
    };
  }

  async list(input: ListImageGenerationsInput = {}): Promise<ImageGeneration[]> {
    return listAllGenerations({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async listPage(input: ListImageGenerationsInput = {}): Promise<ImageGenerationsPage> {
    return listGenerationPage({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async get(id: string, input: GetImageGenerationInput = {}): Promise<ImageGeneration | null> {
    return getGeneration({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async waitFor(id: string, input: WaitForImageGenerationInput = {}): Promise<ImageGeneration> {
    return waitForGeneration({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async waitForBatch(
    ids: string[],
    input: WaitForBatchImageGenerationsInput = {},
  ): Promise<Map<string, ImageGeneration>> {
    return waitForGenerationBatch({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      ids,
      input,
      forcedAssetType: "IMAGE",
    });
  }

  async cooldownStatus(input: ImageCooldownStatusInput = {}): Promise<UserFreeImageCooldownStatus> {
    return this.freeImageCooldownStatus(input);
  }

  async freeImageCooldownStatus(input: ImageCooldownStatusInput = {}): Promise<UserFreeImageCooldownStatus> {
    const workspaceId = requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId");
    this.logger.debug(
      {
        event: "image.cooldown.start",
        workspaceId,
      },
      "Santos image cooldown check started.",
    );

    const data = await this.graphql.request<UserFreeImageCooldownStatusResponse>({
      operationName: "userFreeImageCooldownStatus",
      variables: {
        workspaceId,
      },
      query: USER_FREE_IMAGE_COOLDOWN_STATUS_QUERY,
    });

    this.logger.debug(
      {
        event: "image.cooldown.success",
        workspaceId,
        isEligible: data.userFreeImageCooldownStatus.isEligible,
        cooldownEndsAt: data.userFreeImageCooldownStatus.cooldownEndsAt,
      },
      "Santos image cooldown check completed.",
    );

    return data.userFreeImageCooldownStatus;
  }

  modelConfig(model: ImageGenerationModelConfigSource, imageUrl?: string): ImageGenerationModelConfig {
    return createModelConfig(model, imageUrl);
  }

  mention(model: Pick<CustomModel, "id" | "modelName">, label = model.modelName): string {
    return `@[${requireNonEmpty(label, "label")}](${requireNonEmpty(model.id, "model.id")})`;
  }
}

/** @beta Use through onai.beta.videos. */
export class BetaVideosResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly workspaceId: string;
  private readonly logger: ResolvedOnaiLogger;

  constructor(config: ImagesResourceConfig) {
    this.graphql = config.graphql;
    this.workspaceId = config.workspaceId;
    this.logger = config.logger;
  }

  generate(input: GenerateBetaVideoInput): Promise<ImageGeneration> {
    return createGeneration({
      graphql: this.graphql,
      logger: this.logger,
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
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  async listPage(input: ListImageGenerationsInput = {}): Promise<ImageGenerationsPage> {
    return listGenerationPage({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  async get(id: string, input: GetImageGenerationInput = {}): Promise<ImageGeneration | null> {
    return getGeneration({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  async waitFor(id: string, input: WaitForImageGenerationInput = {}): Promise<ImageGeneration> {
    return waitForGeneration({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      id,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  async waitForBatch(
    ids: string[],
    input: WaitForBatchImageGenerationsInput = {},
  ): Promise<Map<string, ImageGeneration>> {
    return waitForGenerationBatch({
      graphql: this.graphql,
      logger: this.logger,
      defaultWorkspaceId: this.workspaceId,
      ids,
      input,
      forcedAssetType: "VIDEO",
    });
  }

  modelConfig(model: ImageGenerationModelConfigSource, imageUrl?: string): ImageGenerationModelConfig {
    return createModelConfig(model, imageUrl);
  }

  mention(model: Pick<CustomModel, "id" | "modelName">, label = model.modelName): string {
    return `@[${requireNonEmpty(label, "label")}](${requireNonEmpty(model.id, "model.id")})`;
  }
}

async function createGeneration(request: CreateGenerationRequest): Promise<ImageGeneration> {
  const input = request.input;
  const workspaceId = requireNonEmpty(input.workspaceId ?? request.defaultWorkspaceId, "workspaceId");
  const customModelsConfig = normalizeGenerationModelConfigs(
    input.customModelsConfig ?? input.customModelConfigs ?? input.models ?? [],
  );
  const prompt = normalizePromptMentions(requireNonEmpty(input.prompt, "prompt"), customModelsConfig);
  const startedAt = Date.now();
  request.logger.info(
    {
      event: "generation.create.start",
      workspaceId,
      assetType: request.assetType,
      aspectRatio: request.aspectRatio,
      modelCount: customModelsConfig.length,
      mode: input.mode ?? ImageGenerationMode.Default,
      samples: request.samples ?? ImageGenerationVersion.Images1,
    },
    "Santos generation create started.",
  );

  const data = await request.graphql.request<ImageGenerationCreateResponse>({
    operationName: "imageGenerationCreate",
    variables: {
      workspaceId,
      prompt,
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

  const generation = normalizeGenerationOutput(data.imageGenerationCreate);
  request.logger.info(
    {
      event: "generation.create.success",
      workspaceId,
      assetType: request.assetType,
      generationId: generation.id,
      status: generation.status,
      durationMs: Date.now() - startedAt,
    },
    "Santos generation created.",
  );

  return generation;
}

async function bulkCreateGenerations(request: BulkCreateGenerationsRequest): Promise<BulkImageGenerationResult> {
  const input = request.input;
  const workspaceId = requireNonEmpty(input.workspaceId ?? request.defaultWorkspaceId, "workspaceId");
  const bulkGenerationId = requireNonEmpty(input.bulkGenerationId ?? randomUUID(), "bulkGenerationId");
  const rows = normalizeBulkRows(input.rows);
  const startedAt = Date.now();

  request.logger.info(
    {
      event: "generation.bulk_create.start",
      workspaceId,
      bulkGenerationId,
      rowCount: rows.length,
      aspectRatio: input.aspectRatio,
      mode: input.mode ?? ImageGenerationMode.Default,
      samples: input.samples ?? ImageGenerationVersion.Images1,
    },
    "Santos bulk generation create started.",
  );

  const data = await request.graphql.request<ImageGenerationBulkCreateResponse>({
    operationName: "imageGenerationBulkCreate",
    variables: {
      workspaceId,
      prompt: requireNonEmpty(input.prompt, "prompt"),
      aspectRatio: input.aspectRatio,
      mode: input.mode ?? ImageGenerationMode.Default,
      samples: input.samples ?? ImageGenerationVersion.Images1,
      maxRes: input.maxRes,
      bulkGenerationId,
      rows,
    },
    query: IMAGE_GENERATION_BULK_CREATE_MUTATION,
  });

  const result = {
    ...data.imageGenerationBulkCreate,
    imageGenerations: data.imageGenerationBulkCreate.imageGenerations.map(normalizeGenerationOutput),
  };

  request.logger.info(
    {
      event: "generation.bulk_create.success",
      workspaceId,
      bulkGenerationId: result.bulkGenerationId,
      generationCount: result.imageGenerations.length,
      durationMs: Date.now() - startedAt,
    },
    "Santos bulk generation created.",
  );

  return result;
}

interface GenerationLookupRequest<TInput extends GetImageGenerationInput | WaitForImageGenerationInput> {
  graphql: SantosGraphqlClient;
  logger: ResolvedOnaiLogger;
  defaultWorkspaceId: string;
  id: string;
  input: TInput;
  forcedAssetType?: ImageGenerationAssetType | undefined;
}

interface ListGenerationsRequest {
  graphql: SantosGraphqlClient;
  logger: ResolvedOnaiLogger;
  defaultWorkspaceId: string;
  input: ListImageGenerationsInput;
  forcedAssetType?: ImageGenerationAssetType | undefined;
}

interface GenerationBatchLookupRequest {
  graphql: SantosGraphqlClient;
  logger: ResolvedOnaiLogger;
  defaultWorkspaceId: string;
  ids: string[];
  input: WaitForBatchImageGenerationsInput;
  forcedAssetType?: ImageGenerationAssetType | undefined;
}

async function listGenerationPage(request: ListGenerationsRequest): Promise<ImageGenerationsPage> {
  const input = request.input;
  const workspaceId = requireNonEmpty(input.workspaceId ?? request.defaultWorkspaceId, "workspaceId");
  const startedAt = Date.now();
  request.logger.debug(
    {
      event: "generation.list_page.start",
      workspaceId,
      assetType: request.forcedAssetType ?? input.assetType,
      limit: input.limit ?? 20,
      pageSize: input.pageSize ?? input.limit ?? 20,
      hasCursor: Boolean(input.cursor),
      id: input.id,
      status: input.status,
    },
    "Santos generation page fetch started.",
  );

  const data = await request.graphql.request<ImageGenerationsResponse>({
    operationName: "imageGenerations",
    variables: {
      workspaceId,
      first: normalizePositiveInteger(
        input.pageSize ?? input.limit ?? 20,
        input.pageSize === undefined ? "limit" : "pageSize",
      ),
      cursor: input.cursor ?? null,
    },
    query: IMAGE_GENERATIONS_QUERY,
  });

  const page = filterGenerationsPage(data.imageGenerations, input, request.forcedAssetType);
  request.logger.debug(
    {
      event: "generation.list_page.success",
      workspaceId,
      assetType: request.forcedAssetType ?? input.assetType,
      count: page.imageGenerations.length,
      hasNextCursor: Boolean(page.pageInfo.nextCursor),
      durationMs: Date.now() - startedAt,
    },
    "Santos generation page fetch completed.",
  );

  return page;
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
    request.logger.trace(
      {
        event: "generation.list.page_iteration",
        pageCount,
        hasCursor: Boolean(cursor),
      },
      "Santos generation list page iteration.",
    );
    const pageInput: ListImageGenerationsInput = {
      ...input,
      cursor,
    };

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
  const id = requireNonEmpty(request.id, "id");
  const startedAt = Date.now();
  request.logger.debug(
    {
      event: "generation.get.start",
      generationId: id,
      assetType: request.forcedAssetType,
    },
    "Santos generation fetch started.",
  );

  const data = await request.graphql.request<ImageGenerationResponse>({
    operationName: "imageGeneration",
    variables: {
      id,
    },
    query: IMAGE_GENERATION_QUERY,
  });

  const generation = data.imageGeneration ? normalizeGenerationOutput(data.imageGeneration) : null;
  const matchingGeneration =
    generation && (!request.forcedAssetType || generation.assetType === request.forcedAssetType) ? generation : null;

  request.logger.debug(
    {
      event: "generation.get.success",
      generationId: id,
      status: matchingGeneration?.status ?? null,
      found: Boolean(matchingGeneration),
      durationMs: Date.now() - startedAt,
    },
    "Santos generation fetch completed.",
  );

  return matchingGeneration;
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
  request.logger.info(
    {
      event: "generation.wait.start",
      generationId: id,
      targetStatus,
      timeoutMs,
      intervalMs,
      assetType: request.forcedAssetType,
    },
    "Santos generation wait started.",
  );

  while (Date.now() - startedAt <= timeoutMs) {
    const generation = await getGeneration({
      graphql: request.graphql,
      logger: request.logger,
      defaultWorkspaceId: request.defaultWorkspaceId,
      id,
      input: request.input,
      forcedAssetType: request.forcedAssetType,
    });
    request.logger.trace(
      {
        event: "generation.wait.poll",
        generationId: id,
        status: generation?.status ?? null,
        elapsedMs: Date.now() - startedAt,
      },
      "Santos generation wait poll completed.",
    );

    if (generation?.status === targetStatus) {
      request.logger.info(
        {
          event: "generation.wait.success",
          generationId: id,
          status: generation.status,
          elapsedMs: Date.now() - startedAt,
        },
        "Santos generation wait completed.",
      );
      return generation;
    }

    if (generation && terminalStatuses.has(generation.status)) {
      request.logger.warn(
        {
          event: "generation.wait.terminal",
          generationId: id,
          status: generation.status,
          elapsedMs: Date.now() - startedAt,
        },
        "Santos generation reached a terminal status.",
      );
      throw new OnaiApiError("Generation did not complete.", {
        details: {
          generationId: id,
          status: generation.status,
        },
      });
    }

    await sleep(intervalMs);
  }

  request.logger.warn(
    {
      event: "generation.wait.timeout",
      generationId: id,
      timeoutMs,
    },
    "Santos generation wait timed out.",
  );
  throw new OnaiApiError("Timed out waiting for generation.", {
    details: {
      generationId: id,
      timeoutMs,
    },
  });
}

async function waitForGenerationBatch(request: GenerationBatchLookupRequest): Promise<Map<string, ImageGeneration>> {
  const ids = normalizeGenerationIds(request.ids, "ids");
  const targetStatus = request.input.targetStatus ?? "READY";
  const terminalStatuses = new Set(request.input.terminalStatuses ?? ["FAILED", "ERROR", "CANCELED", "CANCELLED"]);
  const timeoutMs = normalizePositiveNumber(request.input.timeoutMs ?? 180_000, "timeoutMs");
  const intervalMs = normalizePositiveNumber(request.input.intervalMs ?? 3_000, "intervalMs");
  const concurrency = normalizePositiveInteger(request.input.concurrency ?? Math.min(ids.length, 5), "concurrency");
  const readyGenerations = new Map<string, ImageGeneration>();
  const failedGenerations = new Map<string, { generation: ImageGeneration; reason: string }>();
  const startedAt = Date.now();

  request.logger.info(
    {
      event: "generation.wait_batch.start",
      generationCount: ids.length,
      targetStatus,
      timeoutMs,
      intervalMs,
      concurrency,
      assetType: request.forcedAssetType,
    },
    "Santos generation batch wait started.",
  );

  while (Date.now() - startedAt <= timeoutMs) {
    const pendingIds = ids.filter((id) => !readyGenerations.has(id) && !failedGenerations.has(id));
    const generations = await mapWithConcurrency(pendingIds, concurrency, async (id) =>
      getGeneration({
        graphql: request.graphql,
        logger: request.logger,
        defaultWorkspaceId: request.defaultWorkspaceId,
        id,
        input: request.input,
        forcedAssetType: request.forcedAssetType,
      }),
    );

    for (const generation of generations) {
      if (!generation || readyGenerations.has(generation.id) || failedGenerations.has(generation.id)) {
        continue;
      }

      if (generation.status === targetStatus) {
        readyGenerations.set(generation.id, generation);
        await request.input.onReady?.(generation.id, generation);
        continue;
      }

      if (terminalStatuses.has(generation.status)) {
        const reason = generation.statusMessage ?? generation.status;
        failedGenerations.set(generation.id, {
          generation,
          reason,
        });
        await request.input.onFail?.(generation.id, reason, generation);
        continue;
      }

      await request.input.onProgress?.(generation.id, generation);
    }

    request.logger.trace(
      {
        event: "generation.wait_batch.poll",
        readyCount: readyGenerations.size,
        failedCount: failedGenerations.size,
        pendingCount: ids.length - readyGenerations.size - failedGenerations.size,
        elapsedMs: Date.now() - startedAt,
      },
      "Santos generation batch wait poll completed.",
    );

    if (failedGenerations.size > 0) {
      const failures = Object.fromEntries(
        [...failedGenerations].map(([id, failure]) => [
          id,
          {
            status: failure.generation.status,
            reason: failure.reason,
          },
        ]),
      );

      request.logger.warn(
        {
          event: "generation.wait_batch.terminal",
          failures,
          elapsedMs: Date.now() - startedAt,
        },
        "One or more Santos batch generations reached a terminal status.",
      );

      throw new OnaiApiError("One or more generations did not complete.", {
        details: {
          failures,
        },
      });
    }

    if (readyGenerations.size === ids.length) {
      request.logger.info(
        {
          event: "generation.wait_batch.success",
          generationCount: ids.length,
          elapsedMs: Date.now() - startedAt,
        },
        "Santos generation batch wait completed.",
      );

      return new Map(ids.map((id) => [id, readyGenerations.get(id) as ImageGeneration]));
    }

    await sleep(intervalMs);
  }

  const pendingIds = ids.filter((id) => !readyGenerations.has(id));
  request.logger.warn(
    {
      event: "generation.wait_batch.timeout",
      pendingIds,
      readyCount: readyGenerations.size,
      timeoutMs,
    },
    "Santos generation batch wait timed out.",
  );

  throw new OnaiApiError("Timed out waiting for generations.", {
    details: {
      pendingIds,
      readyIds: [...readyGenerations.keys()],
      timeoutMs,
    },
  });
}

async function mapWithConcurrency<TInput, TOutput>(
  values: TInput[],
  concurrency: number,
  worker: (value: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = [];
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];

      if (value === undefined) {
        continue;
      }

      results[index] = await worker(value);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      await runWorker();
    }),
  );

  return results;
}

function filterGenerationsPage(
  page: ImageGenerationsPage,
  input: ListImageGenerationsInput,
  forcedAssetType?: ImageGenerationAssetType,
): ImageGenerationsPage {
  const assetType = forcedAssetType ?? input.assetType;
  const limit = input.limit === undefined ? undefined : normalizePositiveInteger(input.limit, "limit");
  const ids = normalizeOptionalGenerationIds(input.ids, "ids");

  let imageGenerations = page.imageGenerations.map(normalizeGenerationOutput);

  if (input.id) {
    imageGenerations = imageGenerations.filter((generation) => generation.id === input.id);
  }

  if (ids) {
    imageGenerations = imageGenerations.filter((generation) => ids.has(generation.id));
  }

  if (input.status) {
    imageGenerations = imageGenerations.filter((generation) => generation.status === input.status);
  }

  if (assetType) {
    imageGenerations = imageGenerations.filter((generation) => generation.assetType === assetType);
  }

  if (input.bulkGenerationId) {
    imageGenerations = imageGenerations.filter((generation) => generation.bulkGenerationId === input.bulkGenerationId);
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
  const customModelConfigs = generation.customModelConfigs?.map(normalizeGenerationCustomModelConfig);
  const promptRaw =
    generation.promptRaw && customModelConfigs
      ? normalizePromptMentions(generation.promptRaw, mentionModelsFromCustomModelConfigs(customModelConfigs))
      : generation.promptRaw;
  const prompt = promptRaw ?? generation.promptDisplay;
  const originalImageUrls =
    generation.output
      ?.map((output) => output.originalUrl ?? output.url)
      .filter((url): url is string => typeof url === "string" && url.length > 0) ?? [];

  return {
    ...generation,
    ...(promptRaw !== undefined ? { promptRaw } : {}),
    ...(prompt !== undefined ? { prompt } : {}),
    ...(customModelConfigs ? { customModelConfigs } : {}),
    originalImageUrl: originalImageUrls[0] ?? null,
    originalImageUrls,
  };
}

interface PromptMentionModel {
  id: string;
  modelName?: string;
}

function mentionModelsFromCustomModelConfigs(configs: ImageGenerationCustomModelConfig[]): PromptMentionModel[] {
  return configs
    .map((config) => config.customModel)
    .filter((model): model is NonNullable<ImageGenerationCustomModelConfig["customModel"]> =>
      Boolean(model?.id && model.modelName),
    )
    .map((model) => ({
      id: model.id,
      modelName: model.modelName,
    }));
}

function normalizeGenerationCustomModelConfig(
  config: ImageGenerationCustomModelConfig,
): ImageGenerationCustomModelConfig {
  const originalImageUrl = firstModelImageOptionUrl(config.customModel);

  if (!originalImageUrl) {
    return config;
  }

  return {
    ...config,
    imageUrl: originalImageUrl,
  };
}

function normalizeGenerationModelConfigs(models: ImageGenerationModelConfigInput[]): ImageGenerationModelConfig[] {
  return models.map(normalizeGenerationModelConfigInput);
}

function normalizeGenerationModelConfigInput(model: ImageGenerationModelConfigInput): ImageGenerationModelConfig {
  if (isGenerationCustomModelConfig(model) || !("imageUrl" in model)) {
    return createModelConfig(model);
  }

  if (model.modelType !== "CHARACTER" && model.modelType !== "OBJECT") {
    throw new OnaiValidationError("models[].modelType must be CHARACTER or OBJECT.");
  }

  return {
    id: requireNonEmpty(model.id, "models[].id"),
    imageUrl: requireNonEmpty(model.imageUrl, "models[].imageUrl"),
    modelType: model.modelType,
    ...(model.modelName !== undefined ? { modelName: model.modelName } : {}),
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

function normalizePromptMentions(prompt: string, models: PromptMentionModel[]): string {
  const mentionModels = models
    .filter((model): model is PromptMentionModel & { modelName: string } => Boolean(model.modelName))
    .map((model) => ({
      ...model,
      normalizedName: normalizeMentionLabel(model.modelName),
    }))
    .filter((model) => model.normalizedName.length > 0)
    .sort((left, right) => right.normalizedName.length - left.normalizedName.length);

  if (mentionModels.length === 0) {
    return prompt;
  }

  return prompt.replace(/(^|[^\[])@([^\s@]+)/g, (match: string, prefix: string, token: string) => {
    if (token.startsWith("[")) {
      return match;
    }

    const { core, suffix } = splitMentionToken(token);
    const normalizedToken = normalizeMentionLabel(core);
    const model = mentionModels.find((candidate) => candidate.normalizedName === normalizedToken);

    if (!model) {
      return match;
    }

    const outsideSuffix =
      suffix && model.modelName.endsWith(suffix) && normalizeMentionLabel(token) === model.normalizedName
        ? ""
        : suffix;

    return `${prefix}@[${model.modelName}](${model.id})${outsideSuffix}`;
  });
}

function splitMentionToken(token: string): { core: string; suffix: string } {
  const match = token.match(/^(.+?)([.,!?;:)\]]*)$/);

  return {
    core: match?.[1] ?? token,
    suffix: match?.[2] ?? "",
  };
}

function normalizeMentionLabel(label: string): string {
  return label.trim().replace(/[.,!?;:)\]]+$/g, "").toLowerCase();
}

function createModelConfig(source: ImageGenerationModelConfigSource, imageUrl?: string): ImageGenerationModelConfig {
  const { model, fallbackImageUrl } = resolveModelConfigSource(source);
  const resolvedImageUrl = imageUrl ?? firstModelImageOptionUrl(model) ?? fallbackImageUrl ?? model.thumbUrl;

  if (!resolvedImageUrl) {
    throw new OnaiValidationError("A model imageUrl is required for generation.");
  }

  return {
    id: requireNonEmpty(model.id, "model.id"),
    imageUrl: resolvedImageUrl,
    modelType: model.modelType,
    modelName: model.modelName,
  };
}

function resolveModelConfigSource(source: ImageGenerationModelConfigSource): {
  model: CustomModel | NonNullable<ImageGenerationCustomModelConfig["customModel"]>;
  fallbackImageUrl?: string;
} {
  if (isGenerationCustomModelConfig(source)) {
    if (!source.customModel) {
      throw new OnaiValidationError("A customModel is required for generation config reuse.");
    }

    return {
      model: source.customModel,
      ...(source.imageUrl !== undefined ? { fallbackImageUrl: source.imageUrl } : {}),
    };
  }

  return {
    model: source,
  };
}

function isGenerationCustomModelConfig(source: ImageGenerationModelConfigSource): source is ImageGenerationCustomModelConfig {
  return "customModel" in source || "warningSnapshot" in source;
}

function firstModelImageOptionUrl(
  model: Pick<CustomModel, "imageOptions"> | NonNullable<ImageGenerationCustomModelConfig["customModel"]> | undefined,
): string | undefined {
  return model?.imageOptions?.[0]?.url;
}

function normalizeBulkRows(rows: BulkImageGenerationRowInput[]): BulkImageGenerationRowInput[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new OnaiValidationError("rows must include at least one bulk generation row.");
  }

  return rows.map((row, rowIndex) => {
    const productModelIds = normalizeOptionalStringList(row.productModelIds, `rows[${rowIndex}].productModelIds`);
    const characterModelIds = normalizeOptionalStringList(row.characterModelIds, `rows[${rowIndex}].characterModelIds`);

    if (!productModelIds && !characterModelIds) {
      throw new OnaiValidationError(
        `rows[${rowIndex}] must include at least one productModelId or characterModelId.`,
      );
    }

    const normalizedRow: BulkImageGenerationRowInput = {};

    if (productModelIds) {
      normalizedRow.productModelIds = productModelIds;
    }

    if (characterModelIds) {
      normalizedRow.characterModelIds = characterModelIds;
    }

    return normalizedRow;
  });
}

function normalizeOptionalStringList(values: string[] | undefined, field: string): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }

  if (!Array.isArray(values) || values.length === 0) {
    throw new OnaiValidationError(`${field} must include at least one id when provided.`);
  }

  return values.map((value, index) => requireNonEmpty(value, `${field}[${index}]`));
}

function normalizeOptionalGenerationIds(ids: string[] | undefined, field: string): Set<string> | undefined {
  if (ids === undefined) {
    return undefined;
  }

  return new Set(normalizeGenerationIds(ids, field));
}

function normalizeGenerationIds(ids: string[], field: string): string[] {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new OnaiValidationError(`${field} must include at least one id.`);
  }

  return [
    ...new Set(
      ids.map((id, index) => requireNonEmpty(id, `${field}[${index}]`)),
    ),
  ];
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

const IMAGE_GENERATION_LOOKUP_FIELDS_FRAGMENT = `fragment ImageGenerationLookupFields on ImageGeneration {
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
}`;

const IMAGE_GENERATION_QUERY = `query imageGeneration($id: String!) {
  imageGeneration(input: {id: $id}) {
    ...ImageGenerationLookupFields
  }
}

${IMAGE_GENERATION_LOOKUP_FIELDS_FRAGMENT}`;

const IMAGE_GENERATION_BULK_CREATE_MUTATION = `mutation imageGenerationBulkCreate($prompt: String!, $workspaceId: String!, $aspectRatio: String, $mode: String, $samples: Int, $maxRes: Boolean, $bulkGenerationId: String!, $rows: [BulkGenerationRowInput!]!) {
  imageGenerationBulkCreate(
    input: {prompt: $prompt, workspaceId: $workspaceId, aspectRatio: $aspectRatio, mode: $mode, samples: $samples, maxRes: $maxRes, bulkGenerationId: $bulkGenerationId, rows: $rows}
  ) {
    bulkGenerationId
    imageGenerations {
      ...ImageGenerationLookupFields
    }
    __typename
  }
}

${IMAGE_GENERATION_LOOKUP_FIELDS_FRAGMENT}`;

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
