import assert from "node:assert/strict";
import { test } from "node:test";

import { createOnaiClient } from "../dist/index.js";

test("uses a persisted access token without refreshing", async () => {
  const calls = [];
  const onai = createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "persisted-access-token",
      accessTokenExpiresAt: Date.now() + 3_600_000,
      refreshToken: "refresh-token",
    },
    fetch: async (url, init) => {
      calls.push(String(url));
      assert.ok(!String(url).includes("securetoken"), "refresh endpoint should not be called");
      assert.equal(init.headers.authorization, "Bearer persisted-access-token");

      return jsonResponse({
        data: {
          userFreeImageCooldownStatus: {
            isEligible: true,
            cooldownEndsAt: null,
            __typename: "UserFreeImageCooldownStatus",
          },
        },
      });
    },
  });

  await onai.images.cooldownStatus();
  const state = await onai.auth.getTokenState();

  assert.equal(calls.length, 1);
  assert.equal(state.accessToken, "persisted-access-token");
  assert.equal(state.refreshToken, "refresh-token");
  assert.ok(state.accessTokenExpiresAt > Date.now());
});

test("refreshes expired persisted token and exposes storable auth state", async () => {
  const savedStates = [];
  let refreshCalls = 0;
  const onai = createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      accessToken: "expired-access-token",
      accessTokenExpiresAt: Date.now() - 1_000,
      refreshToken: "old-refresh-token",
    },
    onAuthTokenChange: (state) => {
      savedStates.push(state);
    },
    fetch: async (url, init) => {
      if (String(url).includes("securetoken")) {
        refreshCalls += 1;
        return jsonResponse({
          id_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: "3600",
        });
      }

      assert.equal(init.headers.authorization, "Bearer new-access-token");
      return jsonResponse({
        data: {
          userFreeImageCooldownStatus: {
            isEligible: true,
            cooldownEndsAt: null,
            __typename: "UserFreeImageCooldownStatus",
          },
        },
      });
    },
  });

  await onai.images.cooldownStatus();
  const state = await onai.auth.getTokenState();

  assert.equal(refreshCalls, 1);
  assert.equal(savedStates.length, 1);
  assert.equal(savedStates[0].accessToken, "new-access-token");
  assert.equal(savedStates[0].refreshToken, "new-refresh-token");
  assert.equal(state.accessToken, "new-access-token");
  assert.equal(state.refreshToken, "new-refresh-token");
  assert.ok(state.accessTokenExpiresAt > Date.now());
});

test("accepts persisted auth state before an access token has been cached", async () => {
  let refreshCalls = 0;
  const onai = createOnaiClient({
    firebaseApiKey: "firebase-api-key",
    workspaceId: "workspace-id",
    authTokenState: {
      refreshToken: "first-refresh-token",
    },
    fetch: async (url, init) => {
      if (String(url).includes("securetoken")) {
        refreshCalls += 1;
        return jsonResponse({
          access_token: "first-access-token",
          expires_in: "3600",
        });
      }

      assert.equal(init.headers.authorization, "Bearer first-access-token");
      return jsonResponse({
        data: {
          userFreeImageCooldownStatus: {
            isEligible: true,
            cooldownEndsAt: null,
            __typename: "UserFreeImageCooldownStatus",
          },
        },
      });
    },
  });

  await onai.images.cooldownStatus();

  assert.equal(refreshCalls, 1);
});

function jsonResponse(body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}
