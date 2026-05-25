import assert from "node:assert/strict";
import { test } from "node:test";

import { createOnaiClient } from "../dist/index.js";

test("images.list filters multiple ids from one history request", async () => {
  let historyCalls = 0;
  const onai = createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "access-token",
      accessTokenExpiresAt: Date.now() + 3_600_000,
      refreshToken: "refresh-token",
    },
    fetch: async (_url, init) => {
      const request = JSON.parse(String(init.body));
      assert.equal(request.operationName, "imageGenerations");
      assert.equal(request.variables.first, 20);
      historyCalls += 1;

      return jsonResponse({
        data: {
          imageGenerations: generationPage([
            generation("gen-a", "READY"),
            generation("gen-b", "PENDING"),
            generation("gen-c", "READY"),
          ]),
        },
      });
    },
  });

  const generations = await onai.images.list({
    ids: ["gen-a", "gen-c"],
    limit: 20,
    maxPages: 1,
  });

  assert.equal(historyCalls, 1);
  assert.deepEqual(
    generations.map((item) => item.id),
    ["gen-a", "gen-c"],
  );
});

test("images.get fetches a practical history page while returning one matching generation", async () => {
  let historyCalls = 0;
  const onai = createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "access-token",
      accessTokenExpiresAt: Date.now() + 3_600_000,
      refreshToken: "refresh-token",
    },
    fetch: async (_url, init) => {
      const request = JSON.parse(String(init.body));
      assert.equal(request.operationName, "imageGenerations");
      assert.equal(request.variables.first, 20);
      historyCalls += 1;

      return jsonResponse({
        data: {
          imageGenerations: generationPage([
            generation("gen-a", "READY"),
            generation("gen-b", "READY"),
            generation("gen-c", "READY"),
          ]),
        },
      });
    },
  });

  const generationResult = await onai.images.get("gen-c");

  assert.equal(historyCalls, 1);
  assert.equal(generationResult?.id, "gen-c");
});

test("waitForBatch polls all ids with one history request per interval", async () => {
  let historyCalls = 0;
  const snapshots = [
    [generation("gen-a", "PENDING"), generation("gen-b", "PENDING")],
    [generation("gen-a", "READY"), generation("gen-b", "PENDING")],
    [generation("gen-a", "READY"), generation("gen-b", "READY")],
  ];
  const progress = [];
  const ready = [];
  const onai = createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "access-token",
      accessTokenExpiresAt: Date.now() + 3_600_000,
      refreshToken: "refresh-token",
    },
    fetch: async (_url, init) => {
      const request = JSON.parse(String(init.body));
      assert.equal(request.operationName, "imageGenerations");
      assert.equal(request.variables.first, 20);
      const snapshot = snapshots[Math.min(historyCalls, snapshots.length - 1)];
      historyCalls += 1;

      return jsonResponse({
        data: {
          imageGenerations: generationPage(snapshot),
        },
      });
    },
  });

  const result = await onai.images.waitForBatch(["gen-a", "gen-b"], {
    intervalMs: 1,
    timeoutMs: 1_000,
    limit: 20,
    maxPages: 1,
    onProgress: (id, item) => progress.push(`${id}:${item.status}`),
    onReady: (id) => ready.push(id),
  });

  assert.equal(historyCalls, 3);
  assert.equal(result.size, 2);
  assert.equal(result.get("gen-a")?.status, "READY");
  assert.equal(result.get("gen-b")?.status, "READY");
  assert.deepEqual(ready, ["gen-a", "gen-b"]);
  assert.ok(progress.includes("gen-a:PENDING"));
  assert.ok(progress.includes("gen-b:PENDING"));
});

test("waitForBatch reports terminal failures without polling each id separately", async () => {
  const failed = [];
  const onai = createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "access-token",
      accessTokenExpiresAt: Date.now() + 3_600_000,
      refreshToken: "refresh-token",
    },
    fetch: async (_url, init) => {
      const request = JSON.parse(String(init.body));
      assert.equal(request.operationName, "imageGenerations");

      return jsonResponse({
        data: {
          imageGenerations: generationPage([
            generation("gen-a", "READY"),
            generation("gen-b", "FAILED", "bad prompt"),
          ]),
        },
      });
    },
  });

  await assert.rejects(
    () =>
      onai.images.waitForBatch(["gen-a", "gen-b"], {
        intervalMs: 1,
        timeoutMs: 100,
        maxPages: 1,
        onFail: (id, reason) => failed.push(`${id}:${reason}`),
      }),
    /One or more generations did not complete/,
  );

  assert.deepEqual(failed, ["gen-b:bad prompt"]);
});

function generation(id, status, statusMessage = null) {
  return {
    id,
    promptRaw: "",
    promptDisplay: "",
    status,
    statusMessage,
    retryable: false,
    workspaceId: "workspace-id",
    output:
      status === "READY"
        ? [
            {
              id: `${id}-output`,
              url: `https://assets.example/${id}.jpg`,
              originalUrl: `https://assets.example/${id}_original.png`,
              __typename: "ImageGenerationOutput",
            },
          ]
        : [],
    options: {
      samples: 1,
      __typename: "ImageGenerationOptions",
    },
    aspectRatio: "4:5",
    styleImageUrls: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assetType: "IMAGE",
    studioIds: [],
    deleted: false,
    __typename: "ImageGeneration",
  };
}

function generationPage(imageGenerations) {
  return {
    pageInfo: {
      nextCursor: null,
      __typename: "PageInfo",
    },
    imageGenerations,
    __typename: "ImageGenerationsPayload",
  };
}

function jsonResponse(body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}
