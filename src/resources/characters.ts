import type {
  CreateCustomModelInput,
  CustomModel,
  CustomModelImageInput,
  CustomModelsResource,
  ListCustomModelsInput,
} from "../internal/custom-models.js";

export type CharacterModelType = "CHARACTER";
export type CharacterImageInput = CustomModelImageInput;
export type CreateCharacterInput = CreateCustomModelInput;
export type ListCharactersInput = Omit<ListCustomModelsInput, "type">;
export type CharacterModel = CustomModel<CharacterModelType>;

interface CharactersResourceConfig {
  customModels: CustomModelsResource;
}

export class CharactersResource {
  private readonly customModels: CustomModelsResource;

  constructor(config: CharactersResourceConfig) {
    this.customModels = config.customModels;
  }

  create(input: CreateCharacterInput): Promise<CharacterModel> {
    return this.customModels.create("CHARACTER", input);
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
