import type {
  CustomModel,
  CustomModelImageInput,
  CustomModelsResource,
  ListCustomModelsInput,
} from "../internal/custom-models.js";
import { resolveCreateModelInput, type CreateModelImageInput, type CreateModelInput } from "./create-model-input.js";
import type { UploadImageInput, UploadsResource } from "./uploads.js";

export type ProductModelType = "OBJECT";
export type ProductImageInput = CustomModelImageInput;
export type ProductUploadImageInput = UploadImageInput;
export type ProductCreateImageInput = CreateModelImageInput;
export type CreateProductInput = CreateModelInput;
export type ListProductsInput = Omit<ListCustomModelsInput, "type">;
export type ProductModel = CustomModel<ProductModelType>;

interface ProductsResourceConfig {
  customModels: CustomModelsResource;
  uploads: UploadsResource;
}

export class ProductsResource {
  private readonly customModels: CustomModelsResource;
  private readonly uploads: UploadsResource;

  constructor(config: ProductsResourceConfig) {
    this.customModels = config.customModels;
    this.uploads = config.uploads;
  }

  async create(input: CreateProductInput): Promise<ProductModel> {
    return this.customModels.create("OBJECT", await resolveCreateModelInput(input, this.uploads));
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
