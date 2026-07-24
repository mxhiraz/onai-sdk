import assert from "node:assert/strict";
import { test } from "node:test";

import { createOnaiClient } from "../dist/index.js";

test("styles.create sends STYLE custom model creation payload", async () => {
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCustomModelCreate");
    assert.deepEqual(request.variables.input, {
      sourceImages: [
        {
          type: "file",
          filePath: "workspace-assets-uploads/workspace-id/custom-models-manual-uploads/upload-id/3.webp",
          id: "upload-id",
        },
      ],
      workspaceId: "workspace-id",
      modelName: "dem",
      modelType: "STYLE",
      skipTraining: true,
    });

    return jsonResponse({
      data: {
        imageGenerationCustomModelCreate: {
          id: "style-id",
          workspaceId: "workspace-id",
          modelName: "dem",
          modelType: "STYLE",
          status: "READY",
          imageOptions: [
            {
              url: "https://storage.googleapis.com/style/original.webp",
              __typename: "CustomModelImageOption",
            },
          ],
          __typename: "CustomModel",
        },
      },
    });
  });

  const style = await onai.styles.create({
    name: "dem",
    image: {
      id: "upload-id",
      filePath: "workspace-assets-uploads/workspace-id/custom-models-manual-uploads/upload-id/3.webp",
    },
  });

  assert.equal(style.id, "style-id");
  assert.equal(style.modelType, "STYLE");
});

test("styles.search filters STYLE models locally", async () => {
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCustomModels");
    assert.deepEqual(request.variables, {
      workspaceId: "workspace-id",
    });

    return jsonResponse({
      data: {
        imageGenerationCustomModels: [
          model("style-id", "dem style", "STYLE"),
          model("product-id", "demo product", "OBJECT"),
          model("other-style-id", "other", "STYLE"),
        ],
      },
    });
  });

  const styles = await onai.styles.search("dem");

  assert.deepEqual(
    styles.map((style) => [style.id, style.modelType]),
    [["style-id", "STYLE"]],
  );
});

test("images.generate forwards STYLE model configs when provided", async () => {
  const rawPrompt = "@[dem](style-id) editorial lighting";
  const mediaReference = {
    url: "https://assets.example/reference.webp",
    mediaType: "IMAGE",
    __typename: "MediaReference",
  };
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "imageGenerationCreate");
    assert.equal(request.variables.prompt, rawPrompt);
    assert.deepEqual(request.variables.mediaReferences, [
      {
        url: mediaReference.url,
        mediaType: mediaReference.mediaType,
      },
    ]);
    assert.deepEqual(request.variables.customModelsConfig, [
      {
        id: "style-id",
        imageUrl: "https://storage.googleapis.com/style/original.webp",
        modelType: "STYLE",
      },
    ]);
    assert.equal(request.variables.isAutoStudio, false);
    assert.equal(request.variables.creationSource, "CREATE_PAGE");
    assert.deepEqual(request.variables.studioRecommendationSources, []);

    return jsonResponse({
      data: {
        imageGenerationCreate: {
          id: "generation-id",
          customModelIds: ["style-id"],
          promptRaw: rawPrompt,
          promptDisplay: "@dem editorial lighting",
          status: "GENERATING",
          workspaceId: "workspace-id",
          output: [
            {
              id: "output-id",
              originalUrl: "https://assets.example/output_original.png",
              width: 1024,
              height: 1280,
              __typename: "ImageGenerationOutput",
            },
          ],
          mediaReferences: [mediaReference],
          assetType: "IMAGE",
          creationSource: "CREATE_PAGE",
          toolProvenance: {
            toolName: "create-page",
            sourceAssetUrl: "https://assets.example/source.webp",
            referenceImageUrls: ["https://assets.example/reference.webp"],
            __typename: "ImageGenerationToolProvenance",
          },
          __typename: "ImageGeneration",
        },
      },
    });
  });

  const generation = await onai.images.generate({
    prompt: "@dem editorial lighting",
    mediaReferences: [mediaReference],
    isAutoStudio: false,
    creationSource: "CREATE_PAGE",
    studioRecommendationSources: [],
    models: [
      onai.images.modelConfig({
        id: "style-id",
        workspaceId: "workspace-id",
        modelName: "dem",
        modelType: "STYLE",
        status: "READY",
        imageOptions: [
          {
            url: "https://storage.googleapis.com/style/original.webp",
          },
        ],
      }),
    ],
  });

  assert.equal(generation.prompt, rawPrompt);
  assert.deepEqual(generation.customModelIds, ["style-id"]);
  assert.equal(generation.originalImageUrl, "https://assets.example/output_original.png");
  assert.equal(generation.output?.[0]?.width, 1024);
  assert.equal(generation.output?.[0]?.height, 1280);
  assert.equal(generation.mediaReferences?.[0]?.url, mediaReference.url);
  assert.equal(generation.creationSource, "CREATE_PAGE");
  assert.equal(generation.toolProvenance?.toolName, "create-page");
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
    __typename: "CustomModel",
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
