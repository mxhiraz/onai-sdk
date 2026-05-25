import type {
  CreateCustomModelInput,
  CustomModel,
  CustomModelImageInput,
  CustomModelsResource,
  ListCustomModelsInput,
} from "../internal/custom-models.js";

export type ProductModelType = "OBJECT";
export type ProductImageInput = CustomModelImageInput;
export type CreateProductInput = CreateCustomModelInput;
export type ListProductsInput = Omit<ListCustomModelsInput, "type">;
export type ProductModel = CustomModel<ProductModelType>;

interface ProductsResourceConfig {
  customModels: CustomModelsResource;
}

export class ProductsResource {
  private readonly customModels: CustomModelsResource;

  constructor(config: ProductsResourceConfig) {
    this.customModels = config.customModels;
  }

  create(input: CreateProductInput): Promise<ProductModel> {
    return this.customModels.create("OBJECT", input);
  }

  list(input: ListProductsInput = {}): Promise<ProductModel[]> {
    return this.customModels.list({
      ...input,
      type: "OBJECT",
    });
  }

  search(query: string, input: Omit<ListProductsInput, "search"> = {}): Promise<ProductModel[]> {
    return this.list({
      ...input,
      search: query,
    });
  }
}
