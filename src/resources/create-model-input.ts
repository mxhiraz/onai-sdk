import type { CreateCustomModelInput, CustomModelImageInput } from "../internal/custom-models.js";
import { isUploadImageInput, type UploadImageInput, type UploadsResource } from "./uploads.js";

export type CreateModelImageInput = CustomModelImageInput | UploadImageInput;

export type CreateModelInput = Omit<CreateCustomModelInput, "image" | "images"> & {
  image?: CreateModelImageInput;
  images?: CreateModelImageInput[];
};

export async function resolveCreateModelInput(
  input: CreateModelInput,
  uploads: UploadsResource,
): Promise<CreateCustomModelInput> {
  const rawImages = input.images ?? (input.image ? [input.image] : []);
  const images = await Promise.all(
    rawImages.map((image) => (isUploadImageInput(image) ? uploads.uploadImage(toUploadImageInput(image, input)) : image)),
  );

  const resolved: CreateCustomModelInput = {
    name: input.name,
  };

  if (typeof input.skipTraining === "boolean") {
    resolved.skipTraining = input.skipTraining;
  }

  if (typeof input.workspaceId === "string") {
    resolved.workspaceId = input.workspaceId;
  }

  if (images.length === 1) {
    const image = images[0];

    if (image) {
      resolved.image = image;
    }
  } else if (images.length > 1) {
    resolved.images = images;
  }

  return resolved;
}

function toUploadImageInput(image: UploadImageInput, input: CreateModelInput): UploadImageInput {
  const resolved: UploadImageInput = {
    fileName: image.fileName,
    contentType: image.contentType,
    body: image.body,
  };

  if (typeof image.id === "string") {
    resolved.id = image.id;
  }

  const workspaceId = image.workspaceId ?? input.workspaceId;

  if (typeof workspaceId === "string") {
    resolved.workspaceId = workspaceId;
  }

  if (image.privacy) {
    resolved.privacy = image.privacy;
  }

  if (image.resourceType) {
    resolved.resourceType = image.resourceType;
  }

  return resolved;
}
