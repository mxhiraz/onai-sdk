# OnAI SDK Documentation

Status: single source of truth
Owner: SDK maintainers
Audience: engineers, AI coding agents, integration partners, and future maintainers
Last reviewed: 2026-05-25

## Purpose

This document is the single long-lived reference for the OnAI server-side TypeScript SDK. It explains what the SDK promises, how to integrate it, how to use every public module, and what maintainers must preserve when the codebase changes.

Use this document when:

- Integrating the SDK into a product backend.
- Looking for copy-paste examples.
- Adding a new first-class SDK module.
- Debugging production integration issues.
- Handing the SDK to another engineer or AI assistant.
- Reviewing whether a change keeps the public contract stable.

Do not create a second SDK guide. Keep examples, public API notes, maintenance rules, beta policy, and AI handoff instructions in this file.

## Executive Summary

The SDK is a server-only TypeScript client for Santos image-generation workflows. It gives backend applications a typed interface for uploading source images, creating product and character AI models, listing/searching those models, generating images, checking cooldown status, and using beta video generation.

The SDK must never run in browser code because it handles refresh tokens. Every integration must load user-specific credentials on the server, create a client for that user or job, call the required SDK methods, and return only safe results to the browser.

## Install

This package is in local development.

```bash
npm install
npm run build
```

Use it from server-side code only. The SDK stores a refresh token and exchanges it for a Firebase bearer token before calling Santos.

## Quick Start

```ts
import {
  ImageGenerationAspectRatio,
  ImageGenerationMode,
  ImageGenerationVersion,
  createOnaiClient,
} from "onai-sdk";

const onai = createOnaiClient({
  refreshToken: account.refreshToken,
  firebaseApiKey: account.firebaseApiKey,
  workspaceId: account.workspaceId,
});

const [character] = await onai.characters.search("tom");
const [product] = await onai.products.search("tss top");

if (!character || !product) {
  throw new Error("Required models were not found.");
}

const generation = await onai.images.generate({
  prompt: `${onai.images.mention(character)} WITH ${onai.images.mention(product)} `,
  aspectRatio: ImageGenerationAspectRatio.Portrait4x5,
  models: [
    onai.images.modelConfig(character),
    onai.images.modelConfig(product),
  ],
  mode: ImageGenerationMode.Max,
  samples: ImageGenerationVersion.Images1,
});

const completed = await onai.images.waitFor(generation.id);

console.log(completed.id);
console.log(completed.originalImageUrl);
```

## Public Contract

The stable public client is created with `createOnaiClient(config)`.

```ts
import { createOnaiClient } from "onai-sdk";

const onai = createOnaiClient({
  refreshToken: userConfig.refreshToken,
  firebaseApiKey: userConfig.firebaseApiKey,
  workspaceId: userConfig.workspaceId,
});
```

The stable modules are:

| Module | Stability | Responsibility |
|---|---:|---|
| `onai.uploads` | Stable | Upload bytes to signed URLs and parse uploaded image references. |
| `onai.products` | Stable | Create, list, and search product models. |
| `onai.characters` | Stable | Create, list, and search character models. |
| `onai.models` | Stable | List and search products and characters together. |
| `onai.images` | Stable | Generate images, fetch generation history/status, wait for completion, and build prompt/model helper values. |
| `onai.generations` | Stable alias | Alias of `onai.images`. |
| `onai.raw` | Stable escape hatch | Call unsupported Santos GraphQL operations directly. |
| `onai.beta.videos` | Beta | Generate videos, fetch beta video generation status, and wait for completion. API may change before becoming stable. |

Do not expose beta video as a top-level stable video module until it is ready to become a stable contract.

## Configuration Model

The SDK supports both single-account and multi-account applications.

Single-account tools may use environment variables:

```ts
const onai = createOnaiClient({
  refreshToken: process.env.SANTOS_REFRESH_TOKEN!,
  firebaseApiKey: process.env.SANTOS_FIREBASE_API_KEY!,
  workspaceId: process.env.SANTOS_WORKSPACE_ID!,
});
```

Multi-user applications should load config from the database per connected account:

```ts
const account = await db.connectedAccounts.findByUserId(userId);

const onai = createOnaiClient({
  refreshToken: account.refreshToken,
  firebaseApiKey: account.firebaseApiKey,
  workspaceId: account.workspaceId,
});
```

Recommended storage fields:

| Field | Required | Notes |
|---|---:|---|
| `userId` | Yes | Your application's owner for the connected Santos account. |
| `refreshToken` | Yes | Store encrypted at rest. Never return to browser code. |
| `firebaseApiKey` | Yes | Required for token refresh. Store server-side. |
| `workspaceId` | Yes | Default workspace for SDK calls. |
| `createdAt` | Yes | Useful for account lifecycle and audits. |
| `updatedAt` | Yes | Useful when credentials rotate. |
| `revokedAt` | Optional | Mark disconnected accounts without deleting audit history. |

Create the SDK client inside the request handler or background job after loading the account. Avoid a global singleton when each user has different credentials.

## Request Headers and User Context

The SDK automatically sends Santos-compatible browser-style headers. You do not need to pass a full header block for normal usage.

By default the SDK sends:

- Browser user agent and language headers.
- Browser client hint and fetch metadata headers.
- `apollo-require-preflight`.
- Santos consent integrations.
- Santos tracking context with `platform: "web"`, the configured workspace ID, and the configured generate route as `url`.

Use the optional `headers` config only when your backend has more specific request context, such as the incoming user agent, language, URL, session ID, or consent values.

```ts
const onai = createOnaiClient({
  refreshToken: account.refreshToken,
  firebaseApiKey: account.firebaseApiKey,
  workspaceId: account.workspaceId,
  headers: {
    userAgent: request.headers.get("user-agent") ?? undefined,
    acceptLanguage: request.headers.get("accept-language") ?? undefined,
    trackingContext: {
      url: "https://your-app.example/generate",
      userId,
      sessionId,
    },
    consentIntegrations: {
      All: false,
      Intercom: true,
      Mixpanel: true,
    },
    additionalHeaders: {
      "x-request-source": "your-backend",
    },
  },
});
```

Header rules:

- `headers` is optional; the SDK sends Santos-compatible defaults automatically.
- `userAgent` and `acceptLanguage` override the automatic defaults when provided.
- `trackingContext` is merged into `x-tracking-context`; the SDK always controls `platform`, `workspaceId`, and `g_workspace_id`.
- `trackingContext.url` can override the automatic web-origin URL.
- `consentIntegrations` is merged with the automatic Santos consent defaults and serialized into `x-consent-integrations`.
- `additionalHeaders` is only for safe custom server headers.
- The SDK manages auth, content type, origin, referer, tracking, consent, and browser-style headers.
- Set `headers.autoBrowserHeaders` to `false` only for tests or custom proxy environments.

## Runtime URLs

Santos runtime URLs are built into the SDK and exposed as `SANTOS_RUNTIME_URLS` for advanced use.

```ts
import { SANTOS_RUNTIME_URLS, createOnaiClient } from "onai-sdk";

const onai = createOnaiClient({
  refreshToken: account.refreshToken,
  firebaseApiKey: account.firebaseApiKey,
  workspaceId: account.workspaceId,
  urls: SANTOS_RUNTIME_URLS,
});
```

Most integrations should not pass `urls`; defaults are already applied. Override runtime URLs only for staging, a server-side proxy, or controlled tests.

## Core Workflows

These examples are the canonical integration path. Keep them current whenever the SDK surface changes.

### Upload Source Image

Use `uploadToSignedUrl()` when the backend has image bytes and a signed upload URL.

```ts
const uploadedImage = await onai.uploads.uploadToSignedUrl({
  signedUrl,
  contentType: "image/jpeg",
  body: imageBytes,
});

console.log(uploadedImage.filePath);
console.log(uploadedImage.id);
```

Use `fromSignedUrl()` only when the file has already been uploaded and the integration needs to reconstruct the SDK image reference.

```ts
const uploadedImage = onai.uploads.fromSignedUrl(signedUrl);
```

The returned object includes `filePath` and `id`, which can be passed to product or character creation.

### Create Product Model

```ts
const product = await onai.products.create({
  name: "tss top",
  image: uploadedImage,
  skipTraining: true,
});

console.log(product.id);
console.log(product.status);
```

Products map to Santos custom models with `modelType: "OBJECT"`.

### Create Character Model

```ts
const character = await onai.characters.create({
  name: "tom",
  image: uploadedImage,
  skipTraining: true,
});

console.log(character.id);
console.log(character.status);
```

Characters map to Santos custom models with `modelType: "CHARACTER"`.

### List and Search Models

```ts
const allModels = await onai.models.list();
const products = await onai.products.search("shirt");
const characters = await onai.characters.search("tom");
```

Search is sent to Santos as a GraphQL input, then product and character shortcuts apply their model-type narrowing.

### Generate Image

```ts
const generation = await onai.images.generate({
  prompt: `${onai.images.mention(character)} WITH ${onai.images.mention(product)} `,
  aspectRatio: ImageGenerationAspectRatio.Portrait4x5,
  models: [
    onai.images.modelConfig(character),
    onai.images.modelConfig(product),
  ],
  mode: ImageGenerationMode.Max,
  samples: ImageGenerationVersion.Images1,
});

const completed = await onai.images.waitFor(generation.id, {
  intervalMs: 3_000,
  timeoutMs: 180_000,
});

console.log(completed.id);
console.log(completed.status);
console.log(completed.originalImageUrl);
console.log(completed.originalImageUrls);
```

`generate()` returns the generation task. `waitFor(id)` polls Santos `imageGenerations` until the generation is `READY`, then returns the completed generation. `originalImageUrl` is the first completed output's original URL. It is `null` until Santos returns generated output. `originalImageUrls` contains every generated output URL, so use it when `samples` is `Images2` or `Images4`.

You can also inspect generation history directly:

```ts
const recentImages = await onai.images.list({ limit: 10 });
const generationById = await onai.images.get(generation.id);
const matchingImages = await onai.images.search("tom", { limit: 20 });
```

Generation search is sent to Santos. `list()` and `search()` follow `pageInfo.nextCursor` across server-filtered pages until they reach `limit`, run out of pages, or hit `maxPages` (default `50`). Use `listPage({ cursor })` when you want to control pagination manually.

Prompt mentions and model configs must stay aligned. If the prompt references a model, include that model in `models` unless a lower-level raw operation intentionally does otherwise.

### Generate Video Beta

Video generation is beta-only.

```ts
const video = await onai.beta.videos.generate({
  prompt: `${onai.beta.videos.mention(character)} with ${onai.beta.videos.mention(product)} `,
  aspectRatio: VideoGenerationAspectRatio.Landscape16x9,
  models: [
    onai.beta.videos.modelConfig(character),
    onai.beta.videos.modelConfig(product),
  ],
  duration: VideoGenerationDuration.Seconds5,
  sound: VideoGenerationSound.Off,
  videoOptions: {
    cameraMotion: VideoGenerationCameraMotion.Auto,
  },
});

const completedVideo = await onai.beta.videos.waitFor(video.id);

console.log(completedVideo.id);
console.log(completedVideo.status);
console.log(completedVideo.originalImageUrl);
```

Keep video integrations behind product flags or internal controls until the API graduates from beta.

### Check Cooldown

```ts
const cooldown = await onai.images.cooldownStatus();

if (!cooldown.isEligible) {
  throw new Error(`Generation cooldown ends at ${cooldown.cooldownEndsAt}`);
}
```

Cooldown status is a helper for product UX. The SDK does not automatically block generation based on cooldown.

## Supported Options

Stable image modes:

```ts
ImageGenerationMode.Default; // "default"
ImageGenerationMode.Max; // "max"
ImageGenerationMode.Premium; // "premium"
```

Stable image ratios:

```ts
ImageGenerationAspectRatio.Portrait9x16; // "9:16"
ImageGenerationAspectRatio.Portrait2x3; // "2:3"
ImageGenerationAspectRatio.Portrait3x4; // "3:4"
ImageGenerationAspectRatio.Portrait4x5; // "4:5"
ImageGenerationAspectRatio.Square; // "1:1"
ImageGenerationAspectRatio.Landscape5x4; // "5:4"
ImageGenerationAspectRatio.Landscape4x3; // "4:3"
ImageGenerationAspectRatio.Landscape3x2; // "3:2"
ImageGenerationAspectRatio.Landscape16x9; // "16:9"
ImageGenerationAspectRatio.Ultrawide21x9; // "21:9"
```

Stable image versions:

```ts
ImageGenerationVersion.Images1; // 1 image
ImageGenerationVersion.Images2; // 2 images
ImageGenerationVersion.Images4; // 4 images
```

Beta video ratios:

```ts
VideoGenerationAspectRatio.Landscape16x9; // "16:9"
VideoGenerationAspectRatio.Square; // "1:1"
VideoGenerationAspectRatio.Portrait9x16; // "9:16"
```

Beta video durations:

```ts
VideoGenerationDuration.Seconds4; // 4s
VideoGenerationDuration.Seconds5; // 5s
VideoGenerationDuration.Seconds6; // 6s
VideoGenerationDuration.Seconds7; // 7s
VideoGenerationDuration.Seconds8; // 8s
VideoGenerationDuration.Seconds9; // 9s
VideoGenerationDuration.Seconds10; // 10s
VideoGenerationDuration.Seconds11; // 11s
VideoGenerationDuration.Seconds12; // 12s
VideoGenerationDuration.Seconds13; // 13s
VideoGenerationDuration.Seconds14; // 14s
VideoGenerationDuration.Seconds15; // 15s
```

Beta video sound:

```ts
VideoGenerationSound.Off; // withAudio false
VideoGenerationSound.On; // withAudio true
```

Beta video camera motion:

```ts
VideoGenerationCameraMotion.Auto; // "AUTO"
```

## Security Rules

The SDK is server-side only. Preserve these rules:

- Never import this SDK in frontend bundles.
- Never expose refresh tokens, Firebase API keys, signed upload URLs, or workspace credentials to browser logs.
- The SDK sends Santos-compatible browser-style headers automatically; only override request context when your backend has better real values.
- Store refresh tokens encrypted at rest.
- Create SDK clients per tenant when accounts differ.
- Return generated asset URLs and safe status fields to the browser, not raw API payloads.
- Keep user-facing errors branded as Santos and avoid exposing raw upstream response bodies.
- Treat `raw.graphqlRequest()` as privileged backend functionality.

## Error Policy

The SDK intentionally trims low-level response payloads from thrown errors. Public errors should be useful but not leak private tokens, provider internals, or raw upstream messages.

Expected error classes:

| Error | Use |
|---|---|
| `OnaiValidationError` | Invalid SDK input or browser runtime usage. |
| `OnaiAuthError` | Token refresh failure or malformed auth response. |
| `OnaiApiError` | Santos GraphQL or upload request failure. |
| `OnaiSdkError` | Base class for SDK-specific errors. |

When adding new errors, include a human-readable message, optional HTTP status, and a compact `details.reason` string. Do not attach full raw responses.

## Beta Policy

Beta APIs must live under `onai.beta`.

Current beta APIs:

- `onai.beta.videos.generate()`
- `onai.beta.videos.create()`
- `onai.beta.videos.list()`
- `onai.beta.videos.search()`
- `onai.beta.videos.get()`
- `onai.beta.videos.waitFor()`
- `onai.beta.videos.modelConfig()`
- `onai.beta.videos.mention()`

Before promoting a beta API to stable:

- Confirm the request shape has stopped changing.
- Confirm naming is consistent with stable modules.
- Add or update examples in this document.
- Keep a migration note for users already on the beta namespace.
- Run the build and public-surface scans listed below.

## Raw GraphQL Policy

`onai.raw.graphqlRequest()` exists so maintainers can move quickly when Santos exposes a workflow before the SDK has a typed wrapper. Use it sparingly.

Add a first-class module when:

- The operation is used by more than one integration.
- The variables are stable enough to type.
- The response is needed by product code.
- The workflow appears in user-facing documentation.

## Maintenance Checklist

Run this checklist whenever the SDK changes:

- Update this document when a workflow, public module, config rule, beta status, security rule, error policy, or example changes.
- Document generated output convenience fields such as `originalImageUrl` when they change.
- Keep this as the only full SDK guide.
- Keep examples server-side.
- Keep video under `onai.beta.videos` until promotion is intentional.
- Keep imports NodeNext-compatible with `.js` endings in source.
- Keep package exports pointed at `dist`.
- Keep `docs` included in `package.json` files.
- Keep automatic request header behavior documented when config changes.
- Keep search server-side; do not add JavaScript text matching for SDK search methods.
- Run `npm run build`.
- Scan for accidental non-Santos branding, `.ts` import endings, and stale stable video references.

Recommended scan categories:

- Stale stable video namespace or old non-beta video type names.
- NodeNext source imports that end in `.ts`.
- Non-Santos public branding.

Expected result: no matches.

## AI Handoff Prompt

Use this prompt when asking an AI coding assistant to integrate or update the SDK:

```text
You are integrating the OnAI server-side TypeScript SDK. Keep the SDK server-only. Load refreshToken, firebaseApiKey, and workspaceId from server-side configuration or the app database for each connected account. Do not expose credentials to browser code.

Use onai.uploads for signed URL uploads, onai.products for product models, onai.characters for character models, onai.models for list/search, onai.images for stable image generation, and onai.beta.videos only for beta video generation. After creating a generation, call waitFor(id) to fetch the READY generation and read originalImageUrl/originalImageUrls. Keep video behind beta controls. Use exported enums instead of raw strings where possible.

Preserve Santos branding in public docs and user-facing errors. Do not expose raw upstream errors. After changes, run npm run build and scan for stale stable video references, non-Santos branding, and .ts import endings.
```

## Glossary

| Term | Meaning |
|---|---|
| Product model | A Santos custom model with `modelType: "OBJECT"`. |
| Character model | A Santos custom model with `modelType: "CHARACTER"`. |
| Source image | Uploaded image used to create a custom model. |
| Prompt mention | `@[name](id)` reference inserted into prompts. |
| Model config | `id`, `imageUrl`, and `modelType` passed to generation. |
| Stable API | Public SDK surface expected to avoid breaking changes. |
| Beta API | Public SDK surface allowed to change before promotion. |
