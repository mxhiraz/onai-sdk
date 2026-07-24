import type {
  CustomModel,
  CustomModelImageInput,
  CustomModelsResource,
  ListCustomModelsInput,
} from "../internal/custom-models.js";
import { resolveCreateModelInput, type CreateModelImageInput, type CreateModelInput } from "./create-model-input.js";
import type { UploadImageInput, UploadsResource } from "./uploads.js";

export type StyleModelType = "STYLE";
export type StyleImageInput = CustomModelImageInput;
export type StyleUploadImageInput = UploadImageInput;
export type StyleCreateImageInput = CreateModelImageInput;
export type CreateStyleInput = CreateModelInput;
export type ListStylesInput = Omit<ListCustomModelsInput, "type">;
export type StyleModel = CustomModel<StyleModelType>;

interface StylesResourceConfig {
  customModels: CustomModelsResource;
  uploads: UploadsResource;
}

export class StylesResource {
  private readonly customModels: CustomModelsResource;
  private readonly uploads: UploadsResource;

  constructor(config: StylesResourceConfig) {
    this.customModels = config.customModels;
    this.uploads = config.uploads;
  }

  async create(input: CreateStyleInput): Promise<StyleModel> {
    return this.customModels.create("STYLE", await resolveCreateModelInput(input, this.uploads));
  }

  list(input: ListStylesInput = {}): Promise<StyleModel[]> {
    return this.customModels.list({
      ...input,
      type: "STYLE",
    });
  }

  search(query: string, input: Omit<ListStylesInput, "search"> = {}): Promise<StyleModel[]> {
    return this.list({
      ...input,
      search: query,
    });
  }
}
