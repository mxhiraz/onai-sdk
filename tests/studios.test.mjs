import assert from "node:assert/strict";
import { test } from "node:test";

import { createOnaiClient } from "../dist/index.js";

test("studios.list follows cursor pagination with workspace defaults", async () => {
  const requests = [];
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    requests.push(request);
    assert.equal(request.operationName, "studios");
    assert.deepEqual(request.variables.filters, {
      workspaceId: "workspace-id",
      type: "WORKSPACE",
    });
    assert.equal(request.variables.orderBy, "USAGE_COUNT_DESC");

    const isFirstPage = request.variables.cursor === null;
    assert.equal(request.variables.first, isFirstPage ? 2 : 1);
    return jsonResponse({
      data: {
        studios: {
          studios: isFirstPage
            ? [studio("studio-a"), studio("studio-b")]
            : [studio("studio-c")],
          pageInfo: {
            nextCursor: isFirstPage ? "cursor-2" : null,
            __typename: "PageInfo",
          },
          __typename: "StudiosPayload",
        },
      },
    });
  });

  const studios = await onai.studios.list({
    limit: 3,
    pageSize: 2,
  });

  assert.equal(requests.length, 2);
  assert.equal(requests[0].variables.cursor, null);
  assert.equal(requests[1].variables.cursor, "cursor-2");
  assert.deepEqual(
    studios.map((item) => item.id),
    ["studio-a", "studio-b", "studio-c"],
  );
});

test("studios.create sends prompt parts without injecting a remix id", async () => {
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "studioCreate");
    assert.deepEqual(request.variables, {
      name: "Editorial Studio",
      published: false,
      type: "WORKSPACE",
      promptParts: [
        {
          type: "BLOCK",
          blockId: "block-lighting",
        },
        {
          type: "TEXT",
          content: " custom studio direction",
        },
      ],
      thumbnails: [],
      workspaceId: "workspace-id",
    });

    return jsonResponse({
      data: {
        studioCreate: {
          ...studio("studio-created"),
          name: "Editorial Studio",
          promptParts: [
            {
              id: "block-lighting",
              categoryId: "lighting",
              name: "Soft light",
              thumbnails: [],
              workspaceId: "workspace-id",
              prompt: "soft light",
              order: 1,
              __typename: "StudioBlock",
            },
            {
              content: " custom studio direction",
              __typename: "StudioText",
            },
          ],
          createdByUser: {
            displayName: "Test User",
            firstName: "Test",
            email: "test@example.com",
            __typename: "User",
          },
          __typename: "Studio",
        },
      },
    });
  });

  const created = await onai.studios.create({
    name: "Editorial Studio",
    promptParts: [
      {
        type: "BLOCK",
        blockId: "block-lighting",
      },
      {
        type: "TEXT",
        content: " custom studio direction",
      },
    ],
  });

  assert.equal(created.id, "studio-created");
  assert.equal(created.name, "Editorial Studio");
  assert.equal(created.promptParts?.length, 2);
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

function studio(id) {
  return {
    id,
    name: id,
    published: false,
    thumbnails: [],
    workspaceId: "workspace-id",
    type: "WORKSPACE",
    createdAt: "2026-06-13T00:00:00.000Z",
    createdBy: "user-id",
    usageCount: 0,
    isProductShotTemplate: false,
    remixedFromStudioId: null,
    bestForCategories: [],
    bestForSizes: [],
    bestForSubcategories: [],
    shotNewSubcategories: [],
    shortDescription: null,
    longDescription: null,
    chipColor: null,
    __typename: "Studio",
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
