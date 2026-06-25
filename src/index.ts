import { resolveOnaiConfig, type OnaiClientConfig } from "./config.js";
import { FirebaseTokenProvider } from "./internal/auth.js";
import { CustomModelsResource } from "./internal/custom-models.js";
import { SantosGraphqlClient } from "./internal/graphql.js";
import { AuthResource } from "./resources/auth.js";
import { CharactersResource } from "./resources/characters.js";
import {
  ImageGenerationAspectRatio,
  ImageGenerationMode,
  ImageGenerationVersion,
  ImagesResource,
  BetaVideosResource,
  VideoGenerationAspectRatio,
  VideoGenerationCameraMotion,
  VideoGenerationDuration,
  VideoGenerationSound,
} from "./resources/images.js";
import { ModelsResource } from "./resources/models.js";
import { ProductsResource } from "./resources/products.js";
import { RawResource } from "./resources/raw.js";
import {
  StudioPromptPartType,
  StudiosOrderBy,
  StudiosResource,
  StudioType,
} from "./resources/studios.js";
import { UploadsResource } from "./resources/uploads.js";

export { OnaiSdkError, OnaiAuthError, OnaiApiError, OnaiValidationError } from "./internal/errors.js";
export { AuthResource } from "./resources/auth.js";
export type {
  GetOnaiAuthTokenStateInput,
  OnaiAuthTokenChangeHandler,
  OnaiAuthTokenState,
  OnaiPersistedAuthTokenState,
} from "./internal/auth.js";
export type { OnaiLogger, OnaiLoggerConfig, OnaiLogLevel, OnaiLogMethod } from "./internal/logger.js";
export {
  ImageGenerationAspectRatio,
  ImageGenerationMode,
  ImageGenerationVersion,
  VideoGenerationAspectRatio,
  VideoGenerationCameraMotion,
  VideoGenerationDuration,
  VideoGenerationSound,
  StudioPromptPartType,
  StudiosOrderBy,
  StudioType,
};
export type { OnaiClientConfig } from "./config.js";
export { SANTOS_RUNTIME_URLS, resolveOnaiRuntimeUrls } from "./runtime-config.js";
export type { OnaiRuntimeUrlOverrides, OnaiRuntimeUrls } from "./runtime-config.js";
export type {
  CreateCustomModelInput,
  CustomModel,
  CustomModelImageInput,
  CustomModelType,
  ListCustomModelsInput,
} from "./internal/custom-models.js";
export type {
  CharacterImageInput,
  CharacterCreateImageInput,
  CharacterModel,
  CharacterModelType,
  CharacterUploadImageInput,
  CreateCharacterInput,
  ListCharactersInput,
} from "./resources/characters.js";
export type {
  BetaVideoOptionsInput,
  BulkImageGenerationResult,
  BulkImageGenerationRowInput,
  GenerationAspectRatio,
  GetImageGenerationInput,
  GenerateBulkImagesInput,
  GenerateBetaVideoInput,
  GenerateImageInput,
  ImageCooldownStatusInput,
  ImageGeneration,
  ImageGenerationAssetType,
  ImageGenerationControlImage,
  ImageGenerationCreationSource,
  ImageGenerationModelConfig,
  ImageGenerationModelConfigInput,
  ImageGenerationModelConfigSource,
  ImageGenerationOutput,
  ImageGenerationUser,
  ImageGenerationOptions,
  ImageGenerationCustomModelConfig,
  ImageGenerationsPage,
  ImageGenerationsPageInfo,
  ListImageGenerationsInput,
  PointInput,
  SizeInput,
  StudioRecommendationSourceInput,
  UserFreeImageCooldownStatus,
  WaitForBatchImageGenerationsInput,
  WaitForImageGenerationInput,
} from "./resources/images.js";
export type { AiModel, ListModelsInput } from "./resources/models.js";
export type {
  CreateProductInput,
  ListProductsInput,
  ProductCreateImageInput,
  ProductImageInput,
  ProductModel,
  ProductModelType,
  ProductUploadImageInput,
} from "./resources/products.js";
export type { RawGraphqlRequest } from "./resources/raw.js";
export type {
  CreateStudioInput,
  ListCombinedStudiosInput,
  ListGlobalStudiosInput,
  ListStudiosInput,
  PreviewStudioInput,
  Studio,
  StudioBlock,
  StudioBlockPromptPartInput,
  StudioCategory,
  StudioCreatedByUser,
  StudioListItem,
  StudioPageInfo,
  StudioPromptPart,
  StudioPromptPartInput,
  StudioPreview,
  StudiosPage,
  StudioText,
  StudioTextPromptPartInput,
  StudioThumbnail,
  StudioThumbnailInput,
} from "./resources/studios.js";
export type {
  CreateWorkspaceAssetUploadUrlInput,
  CreateWorkspaceAssetUploadUrlsInput,
  UploadedImage,
  UploadImageInput,
  UploadImagesInput,
  UploadToSignedUrlInput,
  WorkspaceAssetUploadPrivacy,
  WorkspaceAssetUploadResourceType,
  WorkspaceAssetUploadUrl,
} from "./resources/uploads.js";

export interface OnaiClient {
  auth: AuthResource;
  images: ImagesResource;
  generations: ImagesResource;
  /** @beta APIs in this namespace can change before they become stable. */
  beta: OnaiBetaClient;
  models: ModelsResource;
  products: ProductsResource;
  characters: CharactersResource;
  studios: StudiosResource;
  uploads: UploadsResource;
  raw: RawResource;
}

export interface OnaiBetaClient {
  videos: BetaVideosResource;
}

export function createOnaiClient(config: OnaiClientConfig): OnaiClient {
  const resolvedConfig = resolveOnaiConfig(config);

  const tokenProvider = new FirebaseTokenProvider({
    refreshToken: resolvedConfig.refreshToken,
    firebaseApiKey: resolvedConfig.firebaseApiKey,
    firebaseRefreshTokenEndpoint: resolvedConfig.firebaseRefreshTokenEndpoint,
    fetch: resolvedConfig.fetch,
    logger: resolvedConfig.logger.child({ component: "auth" }),
    accessToken: resolvedConfig.accessToken,
    accessTokenExpiresAt: resolvedConfig.accessTokenExpiresAt,
    authRefreshSkewMs: resolvedConfig.authRefreshSkewMs,
    onAuthTokenChange: resolvedConfig.onAuthTokenChange,
  });

  const graphql = new SantosGraphqlClient({
    endpoint: resolvedConfig.endpoint,
    fetch: resolvedConfig.fetch,
    tokenProvider,
    workspaceId: resolvedConfig.workspaceId,
    origin: resolvedConfig.origin,
    referer: resolvedConfig.referer,
    headers: resolvedConfig.headers,
    logger: resolvedConfig.logger.child({ component: "graphql" }),
  });
  const customModels = new CustomModelsResource({
    graphql,
    workspaceId: resolvedConfig.workspaceId,
    logger: resolvedConfig.logger.child({ component: "custom-models" }),
  });
  const images = new ImagesResource({
    graphql,
    workspaceId: resolvedConfig.workspaceId,
    logger: resolvedConfig.logger.child({ component: "images" }),
  });
  const uploads = new UploadsResource({
    graphql,
    fetch: resolvedConfig.fetch,
    workspaceId: resolvedConfig.workspaceId,
    logger: resolvedConfig.logger.child({ component: "uploads" }),
  });

  return {
    auth: new AuthResource(tokenProvider),
    images,
    generations: images,
    beta: {
      videos: new BetaVideosResource({
        graphql,
        workspaceId: resolvedConfig.workspaceId,
        logger: resolvedConfig.logger.child({ component: "beta-videos" }),
      }),
    },
    models: new ModelsResource({
      customModels,
    }),
    products: new ProductsResource({
      customModels,
      uploads,
    }),
    characters: new CharactersResource({
      customModels,
      uploads,
    }),
    studios: new StudiosResource({
      graphql,
      workspaceId: resolvedConfig.workspaceId,
      logger: resolvedConfig.logger.child({ component: "studios" }),
    }),
    uploads,
    raw: new RawResource(graphql),
  };
}
