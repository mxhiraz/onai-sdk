import assert from "node:assert/strict";
import { test } from "node:test";

import { createOnaiClient } from "../dist/index.js";

test("custom logger receives structured SDK events", async () => {
  const events = [];
  const logger = createMemoryLogger(events);
  const fetch = async (url, init) => {
    if (String(url).includes("securetoken")) {
      return jsonResponse({
        id_token: "test-token",
        expires_in: "3600",
      });
    }

    const request = JSON.parse(String(init.body));
    assert.equal(request.operationName, "userFreeImageCooldownStatus");

    return jsonResponse(
      {
        data: {
          userFreeImageCooldownStatus: {
            isEligible: true,
            cooldownEndsAt: null,
            __typename: "UserFreeImageCooldownStatus",
          },
        },
      },
      {
        "x-request-id": "req_logger_test",
        "x-ratelimit-remaining": "149",
      },
    );
  };

  const onai = createOnaiClient({
    refreshToken: "refresh-token",
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    fetch,
    logger,
  });

  await onai.images.cooldownStatus();

  assertEvent(events, "debug", "Santos auth token refresh started.", {
    component: "auth",
  });
  assertEvent(events, "debug", "Santos GraphQL request started.", {
    component: "graphql",
    operationName: "userFreeImageCooldownStatus",
  });
  assertEvent(events, "debug", "Santos GraphQL request completed.", {
    component: "graphql",
    operationName: "userFreeImageCooldownStatus",
    status: 200,
    requestId: "req_logger_test",
  });
});

function createMemoryLogger(events) {
  const logger = {};

  for (const level of ["trace", "debug", "info", "warn", "error"]) {
    logger[level] = (obj, msg) => {
      events.push({
        level,
        obj,
        msg,
      });
    };
  }

  logger.child = (bindings) => {
    const child = {};

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

    child.child = (extraBindings) => logger.child({ ...bindings, ...extraBindings });
    return child;
  };

  return logger;
}

function assertEvent(events, level, msg, expectedObject) {
  const event = events.find(
    (candidate) =>
      candidate.level === level &&
      candidate.msg === msg &&
      Object.entries(expectedObject).every(([key, value]) => candidate.obj?.[key] === value),
  );

  assert.ok(event, `Expected ${level} log "${msg}" with ${JSON.stringify(expectedObject)}. Got ${JSON.stringify(events)}`);
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
