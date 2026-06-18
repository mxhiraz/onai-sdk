import assert from "node:assert/strict";
import { test } from "node:test";

import { createOnaiClient } from "../dist/index.js";

test("images.generate preserves raw mention syntax and exposes it as the canonical prompt", async () => {
  const rawPrompt =
    "@[Housepride_Blue_Left_Side](v9CkSEzgByPunqTc8AQy) carried by @[Maira](ggA3I6xKN8wr09WWYrsw)";
  const displayPrompt = "@Housepride_Blue_Left_Side carried by @Maira";
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCreate");
    assert.equal(request.variables.prompt, rawPrompt);

    return jsonResponse({
      data: {
        imageGenerationCreate: {
          id: "generation-id",
          promptRaw: rawPrompt,
          promptDisplay: displayPrompt,
          status: "GENERATING",
          workspaceId: "workspace-id",
          output: null,
          assetType: "IMAGE",
          __typename: "ImageGeneration",
        },
      },
    });
  });

  const generation = await onai.images.generate({
    prompt: rawPrompt,
  });

  assert.equal(generation.prompt, rawPrompt);
  assert.equal(generation.promptRaw, rawPrompt);
  assert.equal(generation.promptDisplay, displayPrompt);
});

test("images.generate normalizes returned model config image urls to original model images", async () => {
  const originalImageUrl = "https://storage.example/workspace/custom-model/original.png";
  const cdnImageUrl = "https://cdn.example/workspace/products/model-id/thumb.png";
  const onai = createTestClient(async () =>
    jsonResponse({
      data: {
        imageGenerationCreate: {
          id: "generation-id",
          promptRaw: "@[Product](model-id)",
          promptDisplay: "@Product",
          status: "GENERATING",
          workspaceId: "workspace-id",
          output: null,
          assetType: "IMAGE",
          customModelConfigs: [
            {
              customModel: {
                id: "model-id",
                modelName: "Product",
                modelType: "OBJECT",
                thumbUrl: "https://storage.example/workspace/custom-model/resized.jpg",
                imageOptions: [
                  {
                    url: originalImageUrl,
                    __typename: "CustomModelImageOption",
                  },
                ],
                __typename: "CustomModel",
              },
              imageUrl: cdnImageUrl,
              __typename: "CustomModelConfig",
            },
          ],
          __typename: "ImageGeneration",
        },
      },
    }),
  );

  const generation = await onai.images.generate({
    prompt: "@[Product](model-id)",
  });

  assert.equal(generation.customModelConfigs?.[0]?.imageUrl, originalImageUrl);
});

test("modelConfig accepts generation custom model configs and prefers original model images", () => {
  const originalImageUrl = "https://storage.example/workspace/custom-model/original.png";
  const cdnImageUrl = "https://cdn.example/workspace/products/model-id/thumb.png";
  const generationModelConfig = {
    customModel: {
      id: "model-id",
      modelName: "Product",
      modelType: "OBJECT",
      thumbUrl: "https://storage.example/workspace/custom-model/resized.jpg",
      imageOptions: [
        {
          url: originalImageUrl,
        },
      ],
    },
    imageUrl: cdnImageUrl,
  };
  const onai = createTestClient(async () => {
    throw new Error("fetch should not run");
  });

  assert.deepEqual(onai.images.modelConfig(generationModelConfig), {
    id: "model-id",
    imageUrl: originalImageUrl,
    modelType: "OBJECT",
  });
  assert.deepEqual(onai.beta.videos.modelConfig(generationModelConfig), {
    id: "model-id",
    imageUrl: originalImageUrl,
    modelType: "OBJECT",
  });
});

function createTestClient(fetch) {
  return createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "access-token",
      accessTokenExpiresAt: Date.now() + 3_600_000,
      refreshToken: "refresh-token",
    },
    fetch,
  });
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
