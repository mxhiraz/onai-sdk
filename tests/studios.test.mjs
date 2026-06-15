import assert from "node:assert/strict";
import { test } from "node:test";

import { createOnaiClient } from "../dist/index.js";

test("studios.listWorkspace follows cursor pagination with workspace defaults", async () => {
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

  const studios = await onai.studios.listWorkspace({
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

test("studios.list combines workspace and global published studios with logs", async () => {
  const events = [];
  const requests = [];
  const onai = createTestClient(
    async (_url, init) => {
      const request = JSON.parse(String(init.body));
      requests.push(request);
      assert.equal(request.operationName, "studios");

      const isGlobal = request.variables.filters.published === true;
      return jsonResponse({
        data: {
          studios: {
            studios: isGlobal
              ? [
                  {
                    ...studio("global-studio"),
                    workspaceId: null,
                    type: "GLOBAL",
                    published: true,
                    usageCount: 20,
                  },
                  {
                    ...studio("workspace-studio"),
                    workspaceId: null,
                    type: "GLOBAL",
                    published: true,
                    usageCount: 30,
                  },
                ]
              : [
                  {
                    ...studio("workspace-studio"),
                    usageCount: 10,
                  },
                ],
            pageInfo: {
              nextCursor: null,
              __typename: "PageInfo",
            },
            __typename: "StudiosPayload",
          },
        },
      });
    },
    {
      logger: createMemoryLogger(events),
    },
  );

  const studios = await onai.studios.list({ limit: 10 });

  assert.deepEqual(
    requests.map((request) => request.variables.filters),
    [
      {
        workspaceId: "workspace-id",
        type: "WORKSPACE",
      },
      {
        published: true,
      },
    ],
  );
  assert.deepEqual(
    studios.map((item) => item.id),
    ["global-studio", "workspace-studio"],
  );
  assert.equal(studios[1]?.workspaceId, "workspace-id");
  assert.ok(events.some((event) => event.obj?.event === "studio.list_combined.start"));
  assert.ok(events.some((event) => event.obj?.event === "studio.list_combined.success"));
  assert.equal(
    events.filter((event) => event.obj?.event === "studio.list_scope.success").length,
    2,
  );
  assert.equal(
    events.filter((event) => event.obj?.event === "studio.list_page.start").length,
    2,
  );
});

test("studios.list rejects an ambiguous combined cursor", async () => {
  const onai = createTestClient(async () => {
    throw new Error("fetch should not run");
  });

  await assert.rejects(
    onai.studios.list({
      cursor: "scope-specific-cursor",
    }),
    /cursor is not supported by combined studio listing/,
  );
});

test("studios.list logs combined and scoped failures", async () => {
  const events = [];
  const onai = createTestClient(
    async () =>
      new Response(JSON.stringify({ errors: [{ message: "Request rejected." }] }), {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      }),
    {
      logger: createMemoryLogger(events),
    },
  );

  await assert.rejects(onai.studios.list(), /Santos request failed/);
  assert.ok(events.some((event) => event.obj?.event === "studio.list_page.failure"));
  assert.ok(events.some((event) => event.obj?.event === "studio.list_scope.failure"));
  assert.ok(events.some((event) => event.obj?.event === "studio.list_combined.failure"));
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

test("studios.listCategories returns studio blocks for creation", async () => {
  const onai = createTestClient(async (_url, init) => {
    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "studioCategories");
    assert.deepEqual(request.variables, {});

    return jsonResponse({
      data: {
        studioCategories: [
          {
            id: "lighting",
            name: "Lighting",
            icon: "sun",
            blocks: [
              {
                id: "soft-light",
                categoryId: "lighting",
                name: "Soft light",
                thumbnails: [
                  {
                    url: "https://assets.example/soft-light.jpg",
                    __typename: "StudioBlockThumbnail",
                  },
                ],
                workspaceId: null,
                prompt: "soft diffused light",
                order: 2,
                __typename: "StudioBlock",
              },
              {
                id: "hard-light",
                categoryId: "lighting",
                name: "Hard light",
                thumbnails: [],
                workspaceId: null,
                prompt: "hard directional light",
                order: 3,
                __typename: "StudioBlock",
              },
            ],
            order: 1,
            previewPromptTemplate: "Preview with {{blockPrompt}}",
            __typename: "StudioCategory",
          },
        ],
      },
    });
  });

  const categories = await onai.studios.listCategories();

  assert.equal(categories.length, 1);
  assert.equal(categories[0]?.id, "lighting");
  assert.deepEqual(
    categories[0]?.blocks.map((block) => block.id),
    ["soft-light", "hard-light"],
  );
});

test("studios.preview renders ordered prompt parts with defaults and logs", async () => {
  const events = [];
  const onai = createTestClient(
    async (_url, init) => {
      const request = JSON.parse(String(init.body));
      assert.equal(request.operationName, "imageGenerationPreview");
      assert.deepEqual(request.variables, {
        prompt: "",
        aspectRatio: "4:5",
        promptPartsInput: [
          {
            type: "BLOCK",
            blockId: "lighting-block",
          },
          {
            type: "TEXT",
            content: " clean white backdrop",
          },
        ],
        seed: 42,
      });

      return jsonResponse({
        data: {
          imageGenerationPreview: {
            url: "https://assets.example/studio-preview.jpg",
            __typename: "ImageGenerationPreview",
          },
        },
      });
    },
    {
      logger: createMemoryLogger(events),
    },
  );

  const preview = await onai.studios.preview({
    promptParts: [
      {
        type: "BLOCK",
        blockId: "lighting-block",
      },
      {
        type: "TEXT",
        content: " clean white backdrop",
      },
    ],
  });

  assert.equal(preview.url, "https://assets.example/studio-preview.jpg");
  assert.ok(events.some((event) => event.obj?.event === "studio.preview.start"));
  assert.ok(events.some((event) => event.obj?.event === "studio.preview.success"));
});

test("studios.preview logs failures", async () => {
  const events = [];
  const onai = createTestClient(
    async () =>
      new Response(JSON.stringify({ errors: [{ message: "Preview rejected." }] }), {
        status: 400,
        headers: {
          "content-type": "application/json",
        },
      }),
    {
      logger: createMemoryLogger(events),
    },
  );

  await assert.rejects(
    onai.studios.preview({
      promptParts: [
        {
          type: "BLOCK",
          blockId: "lighting-block",
        },
      ],
    }),
    /Santos request failed/,
  );
  assert.ok(events.some((event) => event.obj?.event === "studio.preview.failure"));
});

function createTestClient(fetch, config = {}) {
  return createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "access-token",
      accessTokenExpiresAt: Date.now() + 3_600_000,
      refreshToken: "refresh-token",
    },
    fetch,
    ...config,
  });
}

function createMemoryLogger(events) {
  const logger = {};

  for (const level of ["trace", "debug", "info", "warn", "error"]) {
    logger[level] = (obj, msg) => {
      events.push({ level, obj, msg });
    };
  }

  logger.child = (bindings) => {
    const child = createMemoryLogger(events);
    const baseChild = child.child;

    for (const level of ["trace", "debug", "info", "warn", "error"]) {
      child[level] = (obj, msg) => {
        events.push({
          level,
          obj: {
            ...bindings,
            ...(obj && typeof obj === "object" ? obj : { value: obj }),
          },
          msg,
        });
      };
    }

    child.child = (extraBindings) => baseChild({ ...bindings, ...extraBindings });
    return child;
  };

  return logger;
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
