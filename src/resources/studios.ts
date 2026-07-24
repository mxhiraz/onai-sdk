import { OnaiValidationError } from "../internal/errors.js";
import type { SantosGraphqlClient } from "../internal/graphql.js";
import type { ResolvedOnaiLogger } from "../internal/logger.js";
import { ImageGenerationAspectRatio } from "./images.js";

export enum StudioType {
  Workspace = "WORKSPACE",
}

export enum StudiosOrderBy {
  UsageCountDesc = "USAGE_COUNT_DESC",
}

export enum StudioPromptPartType {
  Block = "BLOCK",
  Text = "TEXT",
}

export interface StudioBlockPromptPartInput {
  type: StudioPromptPartType.Block | "BLOCK";
  blockId: string;
}

export interface StudioTextPromptPartInput {
  type: StudioPromptPartType.Text | "TEXT";
  content: string;
}

export type StudioPromptPartInput = StudioBlockPromptPartInput | StudioTextPromptPartInput;

export interface StudioThumbnailInput {
  url: string;
}

export interface StudioThumbnail {
  url: string;
  __typename?: string;
}

export interface StudioBlock {
  id: string;
  categoryId?: string | null;
  name?: string | null;
  thumbnails?: StudioThumbnail[];
  workspaceId?: string | null;
  prompt?: string | null;
  order?: number | null;
  __typename?: string;
}

export interface StudioCategory {
  id: string;
  name?: string | null;
  icon?: string | null;
  blocks: StudioBlock[];
  order?: number | null;
  previewPromptTemplate?: string | null;
  __typename?: string;
}

export interface StudioText {
  content: string;
  __typename?: string;
}

export type StudioPromptPart = StudioBlock | StudioText;

export interface StudioCreatedByUser {
  displayName?: string | null;
  firstName?: string | null;
  email?: string | null;
  __typename?: string;
}

export interface StudioListItem {
  id: string;
  name?: string;
  published?: boolean;
  thumbnails?: StudioThumbnail[];
  displayThumbnails?: StudioThumbnail[];
  workspaceId?: string | null;
  type?: StudioType | string;
  createdAt?: string;
  createdBy?: string | null;
  usageCount?: number;
  isProductShotTemplate?: boolean;
  remixedFromStudioId?: string | null;
  bestForCategories?: string[];
  bestForSizes?: string[];
  bestForSubcategories?: string[];
  shotNewSubcategories?: string[];
  shortDescription?: string | null;
  longDescription?: string | null;
  chipColor?: string | null;
  __typename?: string;
}

export interface Studio extends StudioListItem {
  promptParts?: StudioPromptPart[];
  createdByUser?: StudioCreatedByUser | null;
}

export interface StudioPageInfo {
  nextCursor: string | null;
  __typename?: string;
}

export interface StudiosPage {
  studios: StudioListItem[];
  pageInfo: StudioPageInfo;
  __typename?: string;
}

export interface ListStudiosInput {
  workspaceId?: string;
  type?: StudioType;
  orderBy?: StudiosOrderBy;
  cursor?: string | null;
  limit?: number;
  pageSize?: number;
  maxPages?: number;
}

export type ListCombinedStudiosInput = Omit<ListStudiosInput, "cursor" | "type">;

export type ListGlobalStudiosInput = Pick<
  ListStudiosInput,
  "cursor" | "limit" | "pageSize" | "maxPages" | "orderBy"
>;

export interface CreateStudioInput {
  name: string;
  published?: boolean;
  type?: StudioType;
  promptParts: StudioPromptPartInput[];
  thumbnails?: StudioThumbnailInput[];
  workspaceId?: string;
  remixedFromStudioId?: string;
  bestForCategories?: string[];
  bestForSizes?: string[];
  bestForSubcategories?: string[];
  shortDescription?: string;
  longDescription?: string;
  chipColor?: string;
}

export interface PreviewStudioInput {
  promptParts: StudioPromptPartInput[];
  prompt?: string;
  aspectRatio?: ImageGenerationAspectRatio;
  seed?: number;
}

export interface StudioPreview {
  url: string;
  __typename?: string;
}

interface StudiosResourceConfig {
  graphql: SantosGraphqlClient;
  workspaceId: string;
  logger: ResolvedOnaiLogger;
}

interface StudiosResponse {
  studios: StudiosPage;
}

interface StudioCreateResponse {
  studioCreate: Studio;
}

interface StudioCategoriesResponse {
  studioCategories: StudioCategory[];
}

interface StudioPreviewResponse {
  imageGenerationPreview: StudioPreview;
}

export class StudiosResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly workspaceId: string;
  private readonly logger: ResolvedOnaiLogger;

  constructor(config: StudiosResourceConfig) {
    this.graphql = config.graphql;
    this.workspaceId = config.workspaceId;
    this.logger = config.logger;
  }

  async list(input: ListCombinedStudiosInput = {}): Promise<StudioListItem[]> {
    if ("cursor" in input && input.cursor != null) {
      throw new OnaiValidationError(
        "cursor is not supported by combined studio listing. Use listPage() or listGlobalPage().",
      );
    }

    const limit = normalizePositiveInteger(input.limit ?? 30, "limit");
    const startedAt = Date.now();
    this.logger.debug(
      {
        event: "studio.list_combined.start",
        workspaceId: input.workspaceId ?? this.workspaceId,
        limit,
        orderBy: input.orderBy ?? StudiosOrderBy.UsageCountDesc,
      },
      "Santos combined studio list started.",
    );

    try {
      const [workspaceStudios, globalStudios] = await Promise.all([
        this.listWorkspace(input),
        this.listGlobal({
          limit,
          ...(input.pageSize !== undefined ? { pageSize: input.pageSize } : {}),
          ...(input.maxPages !== undefined ? { maxPages: input.maxPages } : {}),
          ...(input.orderBy !== undefined ? { orderBy: input.orderBy } : {}),
        }),
      ]);
      const studios = mergeStudios(workspaceStudios, globalStudios).slice(0, limit);

      this.logger.debug(
        {
          event: "studio.list_combined.success",
          workspaceCount: workspaceStudios.length,
          globalCount: globalStudios.length,
          count: studios.length,
          durationMs: Date.now() - startedAt,
        },
        "Santos combined studio list completed.",
      );

      return studios;
    } catch (error) {
      this.logger.error(
        {
          event: "studio.list_combined.failure",
          durationMs: Date.now() - startedAt,
          ...errorLogFields(error),
        },
        "Santos combined studio list failed.",
      );
      throw error;
    }
  }

  async listWorkspace(input: ListStudiosInput = {}): Promise<StudioListItem[]> {
    return this.listScope("workspace", input, (pageInput) => this.listPage(pageInput));
  }

  async listGlobal(input: ListGlobalStudiosInput = {}): Promise<StudioListItem[]> {
    return this.listScope("global", input, (pageInput) => this.listGlobalPage(pageInput));
  }

  async listPage(input: ListStudiosInput = {}): Promise<StudiosPage> {
    const workspaceId = requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId");
    return this.fetchPage({
      input,
      filters: {
        workspaceId,
        type: input.type ?? StudioType.Workspace,
      },
      scope: "workspace",
    });
  }

  async listGlobalPage(input: ListGlobalStudiosInput = {}): Promise<StudiosPage> {
    return this.fetchPage({
      input,
      filters: {
        published: true,
      },
      scope: "global",
    });
  }

  private async listScope(
    scope: "workspace" | "global",
    input: ListGlobalStudiosInput,
    fetchPage: (input: ListGlobalStudiosInput) => Promise<StudiosPage>,
  ): Promise<StudioListItem[]> {
    const startedAt = Date.now();
    this.logger.debug(
      {
        event: "studio.list_scope.start",
        scope,
        limit: input.limit ?? 30,
        pageSize: input.pageSize ?? 30,
        maxPages: input.maxPages ?? 50,
        hasCursor: Boolean(input.cursor),
      },
      "Santos scoped studio list started.",
    );

    try {
      const studios = await listStudioPages(input, fetchPage);
      this.logger.debug(
        {
          event: "studio.list_scope.success",
          scope,
          count: studios.length,
          durationMs: Date.now() - startedAt,
        },
        "Santos scoped studio list completed.",
      );
      return studios;
    } catch (error) {
      this.logger.error(
        {
          event: "studio.list_scope.failure",
          scope,
          durationMs: Date.now() - startedAt,
          ...errorLogFields(error),
        },
        "Santos scoped studio list failed.",
      );
      throw error;
    }
  }

  private async fetchPage(request: {
    input: ListGlobalStudiosInput;
    filters: Record<string, unknown>;
    scope: "workspace" | "global";
  }): Promise<StudiosPage> {
    const first = normalizePositiveInteger(request.input.pageSize ?? request.input.limit ?? 30, "pageSize");
    const orderBy = request.input.orderBy ?? StudiosOrderBy.UsageCountDesc;
    const startedAt = Date.now();

    this.logger.debug(
      {
        event: "studio.list_page.start",
        scope: request.scope,
        first,
        orderBy,
        hasCursor: Boolean(request.input.cursor),
        filters: request.filters,
      },
      "Santos studio page fetch started.",
    );

    try {
      const data = await this.graphql.request<StudiosResponse>({
        operationName: "studios",
        variables: {
          first,
          cursor: request.input.cursor ?? null,
          filters: request.filters,
          orderBy,
        },
        query: STUDIOS_QUERY,
      });

      this.logger.debug(
        {
          event: "studio.list_page.success",
          scope: request.scope,
          count: data.studios.studios.length,
          hasNextCursor: Boolean(data.studios.pageInfo.nextCursor),
          durationMs: Date.now() - startedAt,
        },
        "Santos studio page fetch completed.",
      );

      return data.studios;
    } catch (error) {
      this.logger.error(
        {
          event: "studio.list_page.failure",
          scope: request.scope,
          durationMs: Date.now() - startedAt,
          ...errorLogFields(error),
        },
        "Santos studio page fetch failed.",
      );
      throw error;
    }
  }

  async create(input: CreateStudioInput): Promise<Studio> {
    const workspaceId = requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId");
    const promptParts = normalizePromptParts(input.promptParts);
    const thumbnails = normalizeThumbnails(input.thumbnails ?? []);
    const startedAt = Date.now();
    const variables = {
      name: requireNonEmpty(input.name, "name"),
      published: input.published ?? false,
      type: input.type ?? StudioType.Workspace,
      promptParts,
      thumbnails,
      workspaceId,
      ...(input.remixedFromStudioId
        ? { remixedFromStudioId: requireNonEmpty(input.remixedFromStudioId, "remixedFromStudioId") }
        : {}),
      ...(input.bestForCategories
        ? { bestForCategories: normalizeStringList(input.bestForCategories, "bestForCategories") }
        : {}),
      ...(input.bestForSizes ? { bestForSizes: normalizeStringList(input.bestForSizes, "bestForSizes") } : {}),
      ...(input.bestForSubcategories
        ? { bestForSubcategories: normalizeStringList(input.bestForSubcategories, "bestForSubcategories") }
        : {}),
      ...(input.shortDescription !== undefined
        ? { shortDescription: requireNonEmpty(input.shortDescription, "shortDescription") }
        : {}),
      ...(input.longDescription !== undefined
        ? { longDescription: requireNonEmpty(input.longDescription, "longDescription") }
        : {}),
      ...(input.chipColor !== undefined ? { chipColor: requireNonEmpty(input.chipColor, "chipColor") } : {}),
    };

    this.logger.info(
      {
        event: "studio.create.start",
        workspaceId,
        promptPartCount: promptParts.length,
        published: variables.published,
        type: variables.type,
      },
      "Santos studio create started.",
    );

    try {
      const data = await this.graphql.request<StudioCreateResponse>({
        operationName: "studioCreate",
        variables,
        query: STUDIO_CREATE_MUTATION,
      });

      this.logger.info(
        {
          event: "studio.create.success",
          workspaceId,
          studioId: data.studioCreate.id,
          durationMs: Date.now() - startedAt,
        },
        "Santos studio created.",
      );

      return data.studioCreate;
    } catch (error) {
      this.logger.error(
        {
          event: "studio.create.failure",
          workspaceId,
          durationMs: Date.now() - startedAt,
          ...errorLogFields(error),
        },
        "Santos studio create failed.",
      );
      throw error;
    }
  }

  async preview(input: PreviewStudioInput): Promise<StudioPreview> {
    const promptParts = normalizePromptParts(input.promptParts);
    const aspectRatio = input.aspectRatio ?? ImageGenerationAspectRatio.Portrait4x5;
    const seed = normalizeInteger(input.seed ?? 42, "seed");
    const startedAt = Date.now();
    const variables = {
      prompt: input.prompt ?? "",
      aspectRatio,
      promptPartsInput: promptParts,
      seed,
    };

    this.logger.info(
      {
        event: "studio.preview.start",
        aspectRatio,
        seed,
        promptPartCount: promptParts.length,
        hasPrompt: variables.prompt.length > 0,
      },
      "Santos studio preview started.",
    );

    try {
      const data = await this.graphql.request<StudioPreviewResponse>({
        operationName: "imageGenerationPreview",
        variables,
        query: STUDIO_PREVIEW_QUERY,
      });

      this.logger.info(
        {
          event: "studio.preview.success",
          aspectRatio,
          seed,
          durationMs: Date.now() - startedAt,
        },
        "Santos studio preview completed.",
      );

      return data.imageGenerationPreview;
    } catch (error) {
      this.logger.error(
        {
          event: "studio.preview.failure",
          aspectRatio,
          seed,
          durationMs: Date.now() - startedAt,
          ...errorLogFields(error),
        },
        "Santos studio preview failed.",
      );
      throw error;
    }
  }

  async listCategories(): Promise<StudioCategory[]> {
    const startedAt = Date.now();
    this.logger.debug(
      {
        event: "studio.categories.start",
      },
      "Santos studio category fetch started.",
    );

    try {
      const data = await this.graphql.request<StudioCategoriesResponse>({
        operationName: "studioCategories",
        variables: {},
        query: STUDIO_CATEGORIES_QUERY,
      });

      this.logger.debug(
        {
          event: "studio.categories.success",
          count: data.studioCategories.length,
          durationMs: Date.now() - startedAt,
        },
        "Santos studio category fetch completed.",
      );

      return data.studioCategories;
    } catch (error) {
      this.logger.error(
        {
          event: "studio.categories.failure",
          durationMs: Date.now() - startedAt,
          ...errorLogFields(error),
        },
        "Santos studio category fetch failed.",
      );
      throw error;
    }
  }
}

async function listStudioPages(
  input: ListGlobalStudiosInput,
  fetchPage: (input: ListGlobalStudiosInput) => Promise<StudiosPage>,
): Promise<StudioListItem[]> {
  const limit = normalizePositiveInteger(input.limit ?? 30, "limit");
  const maxPages = normalizePositiveInteger(input.maxPages ?? 50, "maxPages");
  const requestedPageSize = normalizePositiveInteger(input.pageSize ?? 30, "pageSize");
  const studios: StudioListItem[] = [];
  let cursor = input.cursor ?? null;
  let pageCount = 0;

  do {
    pageCount += 1;
    const page = await fetchPage({
      ...input,
      cursor,
      pageSize: Math.min(requestedPageSize, limit - studios.length),
    });
    studios.push(...page.studios);
    cursor = page.pageInfo.nextCursor;
  } while (cursor && studios.length < limit && pageCount < maxPages);

  return studios.slice(0, limit);
}

function mergeStudios(workspaceStudios: StudioListItem[], globalStudios: StudioListItem[]): StudioListItem[] {
  const studiosById = new Map<string, StudioListItem>();

  for (const studio of [...workspaceStudios, ...globalStudios]) {
    if (!studiosById.has(studio.id)) {
      studiosById.set(studio.id, studio);
    }
  }

  return [...studiosById.values()].sort(
    (left, right) => (right.usageCount ?? 0) - (left.usageCount ?? 0),
  );
}

function errorLogFields(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
    };
  }

  return {
    errorName: "UnknownError",
    errorMessage: String(error),
  };
}

function normalizePromptParts(promptParts: StudioPromptPartInput[]): StudioPromptPartInput[] {
  if (!Array.isArray(promptParts) || promptParts.length === 0) {
    throw new OnaiValidationError("At least one studio prompt part is required.");
  }

  return promptParts.map((part, index) => {
    if (part.type === StudioPromptPartType.Block) {
      return {
        type: StudioPromptPartType.Block,
        blockId: requireNonEmpty(part.blockId, `promptParts[${index}].blockId`),
      };
    }

    if (part.type === StudioPromptPartType.Text) {
      return {
        type: StudioPromptPartType.Text,
        content: requireNonEmpty(part.content, `promptParts[${index}].content`),
      };
    }

    throw new OnaiValidationError(`promptParts[${index}].type must be BLOCK or TEXT.`);
  });
}

function normalizeThumbnails(thumbnails: StudioThumbnailInput[]): StudioThumbnailInput[] {
  if (!Array.isArray(thumbnails)) {
    throw new OnaiValidationError("thumbnails must be an array.");
  }

  return thumbnails.map((thumbnail, index) => ({
    url: requireNonEmpty(thumbnail.url, `thumbnails[${index}].url`),
  }));
}

function normalizeStringList(values: string[], field: string): string[] {
  if (!Array.isArray(values)) {
    throw new OnaiValidationError(`${field} must be an array.`);
  }

  return values.map((value, index) => requireNonEmpty(value, `${field}[${index}]`));
}

function normalizePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new OnaiValidationError(`${field} must be a positive integer.`);
  }

  return value;
}

function normalizeInteger(value: number, field: string): number {
  if (!Number.isInteger(value)) {
    throw new OnaiValidationError(`${field} must be an integer.`);
  }

  return value;
}

function requireNonEmpty(value: string | undefined, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OnaiValidationError(`${field} is required.`);
  }

  return value;
}

const STUDIO_LIST_FIELDS_FRAGMENT = `fragment StudioListFields on Studio {
  id
  name
  published
  thumbnails {
    ...StudioThumbnailFields
    __typename
  }
  displayThumbnails {
    ...StudioThumbnailFields
    __typename
  }
  workspaceId
  type
  createdAt
  createdBy
  usageCount
  isProductShotTemplate
  remixedFromStudioId
  bestForCategories
  bestForSizes
  bestForSubcategories
  shotNewSubcategories
  shortDescription
  longDescription
  chipColor
  __typename
}

fragment StudioThumbnailFields on StudioThumbnail {
  url
  __typename
}`;

const STUDIOS_QUERY = `query studios($first: Int!, $cursor: String, $filters: StudioFiltersInput!, $orderBy: StudiosOrderBy) {
  studios(
    input: {first: $first, cursor: $cursor, filters: $filters, orderBy: $orderBy}
  ) {
    studios {
      ...StudioListFields
      __typename
    }
    pageInfo {
      nextCursor
      __typename
    }
    __typename
  }
}

${STUDIO_LIST_FIELDS_FRAGMENT}`;

const STUDIO_CATEGORIES_QUERY = `query studioCategories {
  studioCategories {
    ...StudioCategoryFields
    __typename
  }
}

fragment StudioCategoryFields on StudioCategory {
  id
  name
  icon
  blocks {
    ...StudioBlockFields
    __typename
  }
  order
  previewPromptTemplate
  __typename
}

fragment StudioBlockFields on StudioBlock {
  id
  categoryId
  name
  thumbnails {
    ...StudioBlockThumbnailFields
    __typename
  }
  workspaceId
  prompt
  order
  __typename
}

fragment StudioBlockThumbnailFields on StudioBlockThumbnail {
  url
  __typename
}`;

const STUDIO_PREVIEW_QUERY = `query imageGenerationPreview($prompt: String!, $aspectRatio: String!, $promptPartsInput: [StudioPromptPartInput!], $seed: Int!) {
  imageGenerationPreview(
    input: {prompt: $prompt, aspectRatio: $aspectRatio, promptPartsInput: $promptPartsInput, seed: $seed}
  ) {
    url
    __typename
  }
}`;

const STUDIO_CREATE_MUTATION = `mutation studioCreate($name: String!, $published: Boolean!, $promptParts: [StudioPromptPartInput!]!, $thumbnails: [StudioThumbnailInput!]!, $type: StudioType!, $workspaceId: String, $remixedFromStudioId: String, $bestForCategories: [String!], $bestForSizes: [String!], $bestForSubcategories: [String!], $shortDescription: String, $longDescription: String, $chipColor: String) {
  studioCreate(
    input: {name: $name, published: $published, promptParts: $promptParts, thumbnails: $thumbnails, type: $type, workspaceId: $workspaceId, remixedFromStudioId: $remixedFromStudioId, bestForCategories: $bestForCategories, bestForSizes: $bestForSizes, bestForSubcategories: $bestForSubcategories, shortDescription: $shortDescription, longDescription: $longDescription, chipColor: $chipColor}
  ) {
    ...StudioFields
    __typename
  }
}

fragment StudioFields on Studio {
  ...StudioListFields
  promptParts {
    ...StudioPromptPartFields
    __typename
  }
  createdByUser {
    displayName
    firstName
    email
    __typename
  }
  __typename
}

fragment StudioPromptPartFields on StudioPromptPart {
  ... on StudioText {
    content
    __typename
  }
  ... on StudioBlock {
    ...StudioBlockFields
    __typename
  }
  __typename
}

fragment StudioBlockFields on StudioBlock {
  id
  categoryId
  name
  thumbnails {
    ...StudioBlockThumbnailFields
    __typename
  }
  workspaceId
  prompt
  order
  __typename
}

fragment StudioBlockThumbnailFields on StudioBlockThumbnail {
  url
  __typename
}

${STUDIO_LIST_FIELDS_FRAGMENT}`;
