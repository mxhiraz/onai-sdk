import { OnaiValidationError } from "./errors.js";
import type { SantosGraphqlClient } from "./graphql.js";

export type CustomModelType = "OBJECT" | "CHARACTER";

export interface CustomModelImageInput {
  filePath: string;
  id: string;
  type?: "file";
}

export interface CreateCustomModelInput {
  name: string;
  image?: CustomModelImageInput;
  images?: CustomModelImageInput[];
  skipTraining?: boolean;
  workspaceId?: string;
}

export interface ListCustomModelsInput {
  workspaceId?: string;
  type?: CustomModelType;
  search?: string;
}

export interface CustomModel<TModelType extends CustomModelType = CustomModelType> {
  id: string;
  workspaceId: string;
  modelName: string;
  modelType: TModelType;
  status: string;
  needsEnrichment?: boolean;
  createdAt?: string;
  thumbUrl?: string | null;
  estimatedTrainingTime?: number | null;
  isDemo?: boolean;
  tokenConcept?: string | null;
  imageOptions?: Array<{ url: string; __typename?: string }>;
  skipTraining?: boolean;
  defaultPlacement?: string | null;
  isHeroModel?: boolean;
  category?: string | null;
  subcategory?: string | null;
  size?: string | null;
  objectDescription?: string | null;
  canonicalName?: string | null;
  sourceShopifyProductId?: string | null;
  sourceShopifyShop?: string | null;
  isWearable?: boolean | null;
  modelAnalysisStatus?: string | null;
  reuseFace?: boolean | null;
  ignoreFeedback?: boolean | null;
  canonicalNameSetByUser?: boolean | null;
  sizeSetByUser?: boolean | null;
  userFeedback?: unknown;
  enrichmentMetadata?: unknown;
  inferenceImages?: unknown[];
  __typename?: string;
}

export interface CustomModelsResourceConfig {
  graphql: SantosGraphqlClient;
  workspaceId: string;
}

interface CreateCustomModelResponse<TModelType extends CustomModelType> {
  imageGenerationCustomModelCreate: CustomModel<TModelType>;
}

interface ListCustomModelsResponse {
  imageGenerationCustomModels: CustomModel[];
}

export class CustomModelsResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly workspaceId: string;

  constructor(config: CustomModelsResourceConfig) {
    this.graphql = config.graphql;
    this.workspaceId = config.workspaceId;
  }

  async create<TModelType extends CustomModelType>(
    modelType: TModelType,
    input: CreateCustomModelInput,
  ): Promise<CustomModel<TModelType>> {
    const workspaceId = requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId");
    const sourceImages = normalizeSourceImages(input);

    const data = await this.graphql.request<CreateCustomModelResponse<TModelType>>({
      operationName: "imageGenerationCustomModelCreate",
      variables: {
        input: {
          sourceImages,
          workspaceId,
          modelName: requireNonEmpty(input.name, "name"),
          modelType,
          skipTraining: input.skipTraining ?? true,
        },
      },
      query: IMAGE_GENERATION_CUSTOM_MODEL_CREATE_MUTATION,
    });

    return data.imageGenerationCustomModelCreate;
  }

  async list<TModelType extends CustomModelType>(
    input: ListCustomModelsInput & { type: TModelType },
  ): Promise<Array<CustomModel<TModelType>>>;
  async list(input?: ListCustomModelsInput): Promise<CustomModel[]>;
  async list(input: ListCustomModelsInput = {}): Promise<CustomModel[]> {
    const workspaceId = requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId");

    const data = await this.graphql.request<ListCustomModelsResponse>({
      operationName: "imageGenerationCustomModels",
      variables: {
        workspaceId,
      },
      query: IMAGE_GENERATION_CUSTOM_MODELS_QUERY,
    });

    return filterCustomModels(data.imageGenerationCustomModels, input);
  }
}

function filterCustomModels(models: CustomModel[], input: ListCustomModelsInput): CustomModel[] {
  const search = normalizeSearch(input.search);

  return models.filter((model) => {
    if (input.type && model.modelType !== input.type) {
      return false;
    }

    if (search && !matchesCustomModelSearch(model, search)) {
      return false;
    }

    return true;
  });
}

function normalizeSearch(search: string | undefined): string | undefined {
  const normalized = search?.trim();
  return normalized ? normalized.toLowerCase() : undefined;
}

function matchesCustomModelSearch(model: CustomModel, search: string): boolean {
  return [
    model.id,
    model.modelName,
    model.canonicalName,
    model.tokenConcept,
    model.category,
    model.subcategory,
    model.objectDescription,
  ].some((value) => typeof value === "string" && value.toLowerCase().includes(search));
}

function normalizeSourceImages(input: CreateCustomModelInput): Array<Required<CustomModelImageInput>> {
  const rawImages = input.images ?? (input.image ? [input.image] : []);

  if (rawImages.length === 0) {
    throw new OnaiValidationError("At least one source image is required.");
  }

  return rawImages.map((image, index) => ({
    type: image.type ?? "file",
    filePath: requireNonEmpty(image.filePath, `images[${index}].filePath`),
    id: requireNonEmpty(image.id, `images[${index}].id`),
  }));
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}

const CUSTOM_MODEL_BASIC_FIELDS_FRAGMENT = `fragment CustomModelBasicFields on CustomModel {
  id
  workspaceId
  modelName
  modelType
  status
  needsEnrichment
  createdAt
  thumbUrl
  estimatedTrainingTime
  isDemo
  tokenConcept
  imageOptions {
    url
    __typename
  }
  skipTraining
  defaultPlacement
  isHeroModel
  category
  subcategory
  size
  objectDescription
  canonicalName
  sourceShopifyProductId
  sourceShopifyShop
  isWearable
  modelAnalysisStatus
  reuseFace
  ignoreFeedback
  canonicalNameSetByUser
  sizeSetByUser
  userFeedback {
    info {
      key
      message
      __typename
    }
    warning {
      key
      message
      __typename
    }
    __typename
  }
  enrichmentMetadata {
    isAmbiguousSubject
    ambiguousSubjectSuggestions
    isAmbiguousSize
    __typename
  }
  inferenceImages {
    id
    imageAnalysis {
      feedback {
        warning {
          key
          message
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
  __typename
}`;

const IMAGE_GENERATION_CUSTOM_MODEL_CREATE_MUTATION = `mutation imageGenerationCustomModelCreate($input: ImageGenerationCustomModelCreateInput!) {
  imageGenerationCustomModelCreate(input: $input) {
    ...CustomModelBasicFields
    __typename
  }
}

${CUSTOM_MODEL_BASIC_FIELDS_FRAGMENT}`;

const IMAGE_GENERATION_CUSTOM_MODELS_QUERY = `query imageGenerationCustomModels($workspaceId: String!) {
  imageGenerationCustomModels(input: {workspaceId: $workspaceId}) {
    ...CustomModelBasicFields
    __typename
  }
}

${CUSTOM_MODEL_BASIC_FIELDS_FRAGMENT}`;
