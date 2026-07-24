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

test("images.generate forwards current Santos studio generation metadata", async () => {
  const rawPrompt = "commercial editorial shoot with @[Product](product-id)\n#[Studio](studio-id)";
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCreate");
    assert.equal(request.variables.prompt, rawPrompt);
    assert.deepEqual(request.variables.studioIds, ["studio-id"]);
    assert.equal(request.variables.isAutoStudio, false);
    assert.equal(request.variables.creationSource, "CREATE_PAGE");
    assert.deepEqual(request.variables.studioRecommendationSources, []);

    return jsonResponse({
      data: {
        imageGenerationCreate: {
          id: "generation-id",
          promptRaw: rawPrompt,
          promptDisplay: "commercial editorial shoot with @Product\n#Studio",
          status: "GENERATING",
          workspaceId: "workspace-id",
          output: null,
          assetType: "IMAGE",
          creationSource: "CREATE_PAGE",
          __typename: "ImageGeneration",
        },
      },
    });
  });

  const generation = await onai.images.generate({
    prompt: rawPrompt,
    studioIds: ["studio-id"],
    isAutoStudio: false,
    creationSource: "CREATE_PAGE",
    studioRecommendationSources: [],
  });

  assert.equal(generation.prompt, rawPrompt);
  assert.equal(generation.creationSource, "CREATE_PAGE");
});

test("images.generate upgrades plain prompt mentions to raw id mentions in place", async () => {
  const product = model("2HvRX7MmrLLP0JzoMmgQ", "Vienna_Coolmint_S_Right_Side", "OBJECT");
  const secondProduct = model("3TuUykBKTUty5OyWytvy", "Vienna_Coolmint_M_Front_Side.", "OBJECT");
  const character = model("jfa49KkQS98b0sFzUS7U", "Kunal", "CHARACTER");
  const rawPrompt =
    "@[Vienna_Coolmint_S_Right_Side](2HvRX7MmrLLP0JzoMmgQ) standing right, " +
    "@[Vienna_Coolmint_M_Front_Side.](3TuUykBKTUty5OyWytvy) standing left. " +
    "@[Kunal](jfa49KkQS98b0sFzUS7U).. sits behind the left bag.";
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCreate");
    assert.equal(request.variables.prompt, rawPrompt);

    return jsonResponse({
      data: {
        imageGenerationCreate: {
          id: "generation-id",
          promptRaw: rawPrompt,
          promptDisplay:
            "@Vienna_Coolmint_S_Right_Side standing right, @Vienna_Coolmint_M_Front_Side. standing left. @Kunal.. sits behind the left bag.",
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
    prompt:
      "@Vienna_Coolmint_S_Right_Side standing right, " +
      "@Vienna_Coolmint_M_Front_Side. standing left. " +
      "@kunal.. sits behind the left bag.",
    models: [
      onai.images.modelConfig(product),
      onai.images.modelConfig(secondProduct),
      onai.images.modelConfig(character),
    ],
  });

  assert.equal(generation.prompt, rawPrompt);
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
    modelName: "Product",
  });
  assert.deepEqual(onai.beta.videos.modelConfig(generationModelConfig), {
    id: "model-id",
    imageUrl: originalImageUrl,
    modelType: "OBJECT",
    modelName: "Product",
  });
});

test("images.generate accepts returned custom model configs without sending cdn image urls", async () => {
  const originalImageUrl = "https://storage.googleapis.com/airpict.appspot.com/workspace/custom-model/original.png";
  const cdnImageUrl = "https://onai.b-cdn.net/workspace/products/model-id/thumb.png";
  const generationModelConfig = {
    customModel: {
      id: "model-id",
      modelName: "Product",
      modelType: "OBJECT",
      thumbUrl: "https://storage.googleapis.com/airpict.appspot.com/workspace/custom-model/resized.jpg",
      imageOptions: [
        {
          url: originalImageUrl,
        },
      ],
    },
    imageUrl: cdnImageUrl,
  };
  const rawPrompt = "@[Product](model-id) in a clean studio";
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCreate");
    assert.equal(request.variables.prompt, rawPrompt);
    assert.deepEqual(request.variables.customModelsConfig, [
      {
        id: "model-id",
        imageUrl: originalImageUrl,
        modelType: "OBJECT",
      },
    ]);

    return jsonResponse({
      data: {
        imageGenerationCreate: {
          id: "generation-id",
          promptRaw: rawPrompt,
          promptDisplay: "@Product in a clean studio",
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
    prompt: "@Product in a clean studio",
    models: [generationModelConfig],
  });

  assert.equal(generation.prompt, rawPrompt);
});

test("images.generate accepts customModelConfigs alias from returned generations", async () => {
  const originalImageUrl = "https://storage.googleapis.com/airpict.appspot.com/workspace/custom-model/original.png";
  const cdnImageUrl = "https://onai.b-cdn.net/workspace/products/model-id/thumb.png";
  const generationModelConfig = {
    customModel: {
      id: "model-id",
      modelName: "Product",
      modelType: "OBJECT",
      thumbUrl: "https://storage.googleapis.com/airpict.appspot.com/workspace/custom-model/resized.jpg",
      imageOptions: [
        {
          url: originalImageUrl,
        },
      ],
    },
    imageUrl: cdnImageUrl,
  };
  const rawPrompt = "@[Product](model-id) in a clean studio";
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCreate");
    assert.equal(request.variables.prompt, rawPrompt);
    assert.deepEqual(request.variables.customModelsConfig, [
      {
        id: "model-id",
        imageUrl: originalImageUrl,
        modelType: "OBJECT",
      },
    ]);

    return jsonResponse({
      data: {
        imageGenerationCreate: {
          id: "generation-id",
          promptRaw: "@Product in a clean studio",
          promptDisplay: "@Product in a clean studio",
          status: "GENERATING",
          workspaceId: "workspace-id",
          output: null,
          assetType: "IMAGE",
          customModelConfigs: [
            {
              ...generationModelConfig,
              __typename: "CustomModelConfig",
            },
          ],
          __typename: "ImageGeneration",
        },
      },
    });
  });

  const generation = await onai.images.generate({
    prompt: "@Product in a clean studio",
    customModelConfigs: [generationModelConfig],
  });

  assert.equal(generation.prompt, rawPrompt);
  assert.equal(generation.promptRaw, rawPrompt);
  assert.equal(generation.customModelConfigs?.[0]?.imageUrl, originalImageUrl);
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

function model(id, modelName, modelType) {
  return {
    id,
    workspaceId: "workspace-id",
    modelName,
    modelType,
    status: "READY",
    imageOptions: [
      {
        url: `https://storage.example/${id}/original.png`,
      },
    ],
  };
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
