import { OnaiValidationError } from "../internal/errors.js";
import type { SantosGraphqlClient } from "../internal/graphql.js";
import type { ResolvedOnaiLogger } from "../internal/logger.js";

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
  workspaceId?: string;
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

export class StudiosResource {
  private readonly graphql: SantosGraphqlClient;
  private readonly workspaceId: string;
  private readonly logger: ResolvedOnaiLogger;

  constructor(config: StudiosResourceConfig) {
    this.graphql = config.graphql;
    this.workspaceId = config.workspaceId;
    this.logger = config.logger;
  }

  async list(input: ListStudiosInput = {}): Promise<StudioListItem[]> {
    const limit = normalizePositiveInteger(input.limit ?? 30, "limit");
    const maxPages = normalizePositiveInteger(input.maxPages ?? 50, "maxPages");
    const requestedPageSize = normalizePositiveInteger(input.pageSize ?? 30, "pageSize");
    const studios: StudioListItem[] = [];
    let cursor = input.cursor ?? null;
    let pageCount = 0;

    do {
      pageCount += 1;
      const page = await this.listPage({
        ...input,
        cursor,
        pageSize: Math.min(requestedPageSize, limit - studios.length),
      });
      studios.push(...page.studios);
      cursor = page.pageInfo.nextCursor;
    } while (cursor && studios.length < limit && pageCount < maxPages);

    return studios.slice(0, limit);
  }

  async listPage(input: ListStudiosInput = {}): Promise<StudiosPage> {
    const workspaceId = requireNonEmpty(input.workspaceId ?? this.workspaceId, "workspaceId");
    const first = normalizePositiveInteger(input.pageSize ?? input.limit ?? 30, "pageSize");
    const type = input.type ?? StudioType.Workspace;
    const orderBy = input.orderBy ?? StudiosOrderBy.UsageCountDesc;
    const startedAt = Date.now();

    this.logger.debug(
      {
        event: "studio.list_page.start",
        workspaceId,
        first,
        type,
        orderBy,
        hasCursor: Boolean(input.cursor),
      },
      "Santos studio page fetch started.",
    );

    const data = await this.graphql.request<StudiosResponse>({
      operationName: "studios",
      variables: {
        first,
        cursor: input.cursor ?? null,
        filters: {
          workspaceId,
          type,
        },
        orderBy,
      },
      query: STUDIOS_QUERY,
    });

    this.logger.debug(
      {
        event: "studio.list_page.success",
        workspaceId,
        count: data.studios.studios.length,
        hasNextCursor: Boolean(data.studios.pageInfo.nextCursor),
        durationMs: Date.now() - startedAt,
      },
      "Santos studio page fetch completed.",
    );

    return data.studios;
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
  }
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
