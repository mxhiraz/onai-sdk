import { resolveOnaiConfig, type OnaiClientConfig } from "./config.js";
import { FirebaseTokenProvider } from "./internal/auth.js";
import { CustomModelsResource } from "./internal/custom-models.js";
import { SantosGraphqlClient } from "./internal/graphql.js";
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
import { UploadsResource } from "./resources/uploads.js";

export { OnaiSdkError, OnaiAuthError, OnaiApiError, OnaiValidationError } from "./internal/errors.js";
export {
  ImageGenerationAspectRatio,
  ImageGenerationMode,
  ImageGenerationVersion,
  VideoGenerationAspectRatio,
  VideoGenerationCameraMotion,
  VideoGenerationDuration,
  VideoGenerationSound,
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
  CharacterModel,
  CharacterModelType,
  CreateCharacterInput,
  ListCharactersInput,
} from "./resources/characters.js";
export type {
  BetaVideoOptionsInput,
  GenerationAspectRatio,
  GetImageGenerationInput,
  GenerateBetaVideoInput,
  GenerateImageInput,
  ImageCooldownStatusInput,
  ImageGeneration,
  ImageGenerationAssetType,
  ImageGenerationControlImage,
  ImageGenerationModelConfig,
  ImageGenerationOutput,
  ImageGenerationUser,
  ImageGenerationOptions,
  ImageGenerationCustomModelConfig,
  ImageGenerationsPage,
  ImageGenerationsPageInfo,
  ListImageGenerationsInput,
  PointInput,
  SizeInput,
  StudioListItem,
  UserFreeImageCooldownStatus,
  WaitForImageGenerationInput,
} from "./resources/images.js";
export type { AiModel, ListModelsInput } from "./resources/models.js";
export type {
  CreateProductInput,
  ListProductsInput,
  ProductImageInput,
  ProductModel,
  ProductModelType,
} from "./resources/products.js";
export type { RawGraphqlRequest } from "./resources/raw.js";
export type { UploadedImage, UploadToSignedUrlInput } from "./resources/uploads.js";

export interface OnaiClient {
  images: ImagesResource;
  generations: ImagesResource;
  /** @beta APIs in this namespace can change before they become stable. */
  beta: OnaiBetaClient;
  models: ModelsResource;
  products: ProductsResource;
  characters: CharactersResource;
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
  });

  const graphql = new SantosGraphqlClient({
    endpoint: resolvedConfig.endpoint,
    fetch: resolvedConfig.fetch,
    tokenProvider,
    workspaceId: resolvedConfig.workspaceId,
    origin: resolvedConfig.origin,
    referer: resolvedConfig.referer,
    headers: resolvedConfig.headers,
  });
  const customModels = new CustomModelsResource({
    graphql,
    workspaceId: resolvedConfig.workspaceId,
  });
  const images = new ImagesResource({
    graphql,
    workspaceId: resolvedConfig.workspaceId,
  });

  return {
    images,
    generations: images,
    beta: {
      videos: new BetaVideosResource({
        graphql,
        workspaceId: resolvedConfig.workspaceId,
      }),
    },
    models: new ModelsResource({
      customModels,
    }),
    products: new ProductsResource({
      customModels,
    }),
    characters: new CharactersResource({
      customModels,
    }),
    uploads: new UploadsResource({
      fetch: resolvedConfig.fetch,
      origin: resolvedConfig.origin,
      referer: resolvedConfig.referer,
      headers: resolvedConfig.headers,
    }),
    raw: new RawResource(graphql),
  };
}
