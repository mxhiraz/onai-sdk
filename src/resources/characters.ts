import type {
  CustomModel,
  CustomModelImageInput,
  CustomModelsResource,
  ListCustomModelsInput,
} from "../internal/custom-models.js";
import { resolveCreateModelInput, type CreateModelImageInput, type CreateModelInput } from "./create-model-input.js";
import type { UploadImageInput, UploadsResource } from "./uploads.js";

export type CharacterModelType = "CHARACTER";
export type CharacterImageInput = CustomModelImageInput;
export type CharacterUploadImageInput = UploadImageInput;
export type CharacterCreateImageInput = CreateModelImageInput;
export type CreateCharacterInput = CreateModelInput;
export type ListCharactersInput = Omit<ListCustomModelsInput, "type">;
export type CharacterModel = CustomModel<CharacterModelType>;

interface CharactersResourceConfig {
  customModels: CustomModelsResource;
  uploads: UploadsResource;
}

export class CharactersResource {
  private readonly customModels: CustomModelsResource;
  private readonly uploads: UploadsResource;

  constructor(config: CharactersResourceConfig) {
    this.customModels = config.customModels;
    this.uploads = config.uploads;
  }

  async create(input: CreateCharacterInput): Promise<CharacterModel> {
    return this.customModels.create("CHARACTER", await resolveCreateModelInput(input, this.uploads));
  }

  list(input: ListCharactersInput = {}): Promise<CharacterModel[]> {
    return this.customModels.list({
      ...input,
      type: "CHARACTER",
    });
  }

  search(query: string, input: Omit<ListCharactersInput, "search"> = {}): Promise<CharacterModel[]> {
    return this.list({
      ...input,
      search: query,
    });
  }
}
