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
