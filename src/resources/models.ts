import type { CustomModel, CustomModelsResource, ListCustomModelsInput } from "../internal/custom-models.js";

export type ListModelsInput = ListCustomModelsInput;
export type AiModel = CustomModel;

interface ModelsResourceConfig {
  customModels: CustomModelsResource;
}

export class ModelsResource {
  private readonly customModels: CustomModelsResource;

  constructor(config: ModelsResourceConfig) {
    this.customModels = config.customModels;
  }

  list(input: ListModelsInput = {}): Promise<AiModel[]> {
    return this.customModels.list(input);
  }

  search(query: string, input: Omit<ListModelsInput, "search"> = {}): Promise<AiModel[]> {
    return this.customModels.list({
      ...input,
      search: query,
    });
  }
}
