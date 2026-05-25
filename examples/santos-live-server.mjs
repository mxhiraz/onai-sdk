import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ImageGenerationAspectRatio,
  ImageGenerationMode,
  ImageGenerationVersion,
  VideoGenerationAspectRatio,
  VideoGenerationCameraMotion,
  VideoGenerationDuration,
  VideoGenerationSound,
  createOnaiClient,
} from "../dist/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, "santos-live.html");
const port = Number(process.env.PORT ?? 4317);

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && (request.url === "/" || request.url === "/santos-live.html")) {
      const html = await readFile(htmlPath, "utf8");
      sendText(response, 200, html, "text/html; charset=utf-8");
      return;
    }

    if (request.method !== "POST" || !request.url?.startsWith("/api/")) {
      sendJson(response, 404, { error: "Route not found." });
      return;
    }

    const body = await readJsonBody(request);
    const onai = createClient(body.config);
    const data = await handleApiRequest(request.url, onai, body);

    sendJson(response, 200, { data });
  } catch (error) {
    sendJson(response, statusFromError(error), {
      error: error instanceof Error ? error.message : "Request failed.",
      details: error?.details,
    });
  }
});

server.listen(port, () => {
  console.log(`OnAI SDK sample server: http://localhost:${port}`);
});

async function handleApiRequest(path, onai, body) {
  switch (path) {
    case "/api/cooldown":
      return onai.images.cooldownStatus();

    case "/api/raw/cooldown":
      return onai.raw.graphqlRequest({
        operationName: "userFreeImageCooldownStatus",
        variables: {
          workspaceId: requiredString(body.config?.workspaceId, "config.workspaceId"),
        },
        query: `query userFreeImageCooldownStatus($workspaceId: String!) {
          userFreeImageCooldownStatus(input: {workspaceId: $workspaceId}) {
            isEligible
            cooldownEndsAt
            __typename
          }
        }`,
      });

    case "/api/models":
      return onai.models.list(compactInput({ search: body.search, type: body.type }));

    case "/api/products":
      return onai.products.search(body.search ?? "");

    case "/api/characters":
      return onai.characters.search(body.search ?? "");

    case "/api/images":
      return onai.images.list({
        search: optionalString(body.search),
        limit: optionalNumber(body.limit, 12),
        maxPages: optionalNumber(body.maxPages, 2),
      });

    case "/api/videos":
      return onai.beta.videos.list({
        search: optionalString(body.search),
        limit: optionalNumber(body.limit, 12),
        maxPages: optionalNumber(body.maxPages, 2),
      });

    case "/api/uploads/from-signed-url":
      return onai.uploads.fromSignedUrl(requiredString(body.signedUrl, "signedUrl"));

    case "/api/uploads/upload":
      return onai.uploads.uploadToSignedUrl({
        signedUrl: requiredString(body.signedUrl, "signedUrl"),
        contentType: requiredString(body.contentType, "contentType"),
        body: decodeBase64Body(requiredString(body.bodyBase64, "bodyBase64")),
      });

    case "/api/products/create":
      return onai.products.create({
        name: requiredString(body.name, "name"),
        image: requiredObject(body.image, "image"),
        skipTraining: body.skipTraining ?? true,
      });

    case "/api/characters/create":
      return onai.characters.create({
        name: requiredString(body.name, "name"),
        image: requiredObject(body.image, "image"),
        skipTraining: body.skipTraining ?? true,
      });

    case "/api/images/generate": {
      const generation = await onai.images.generate({
        prompt: requiredString(body.prompt, "prompt"),
        aspectRatio: body.aspectRatio ?? ImageGenerationAspectRatio.Portrait4x5,
        models: normalizeGenerationModels(body.models),
        mode: body.mode ?? ImageGenerationMode.Default,
        samples: body.samples ?? ImageGenerationVersion.Images1,
      });

      if (!body.wait) {
        return generation;
      }

      return onai.images.waitFor(generation.id, {
        intervalMs: optionalNumber(body.intervalMs, 3000),
        timeoutMs: optionalNumber(body.timeoutMs, 180000),
      });
    }

    case "/api/videos/generate": {
      const generation = await onai.beta.videos.generate({
        prompt: requiredString(body.prompt, "prompt"),
        aspectRatio: body.aspectRatio ?? VideoGenerationAspectRatio.Landscape16x9,
        models: normalizeGenerationModels(body.models),
        mode: body.mode ?? ImageGenerationMode.Default,
        duration: body.duration ?? VideoGenerationDuration.Seconds5,
        sound: body.sound ?? VideoGenerationSound.Off,
        videoOptions: {
          cameraMotion: body.cameraMotion ?? VideoGenerationCameraMotion.Auto,
        },
      });

      if (!body.wait) {
        return generation;
      }

      return onai.beta.videos.waitFor(generation.id, {
        intervalMs: optionalNumber(body.intervalMs, 3000),
        timeoutMs: optionalNumber(body.timeoutMs, 300000),
      });
    }

    default:
      throw Object.assign(new Error("Unknown API route."), { status: 404 });
  }
}

function createClient(config) {
  return createOnaiClient({
    firebaseApiKey: requiredString(config?.firebaseApiKey, "config.firebaseApiKey"),
    refreshToken: requiredString(config?.refreshToken, "config.refreshToken"),
    workspaceId: requiredString(config?.workspaceId, "config.workspaceId"),
  });
}

function normalizeGenerationModels(models) {
  if (!Array.isArray(models) || models.length === 0) {
    throw Object.assign(new Error("At least one generation model is required."), { status: 400 });
  }

  return models.map((model, index) => ({
    id: requiredString(model?.id, `models[${index}].id`),
    imageUrl: requiredString(model?.imageUrl ?? model?.imageOptions?.[0]?.url ?? model?.thumbUrl, `models[${index}].imageUrl`),
    modelType: requiredString(model?.modelType, `models[${index}].modelType`),
  }));
}

function compactInput(input) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");
  return rawBody ? JSON.parse(rawBody) : {};
}

function decodeBase64Body(value) {
  const base64 = value.includes(",") ? value.slice(value.indexOf(",") + 1) : value;
  return Buffer.from(base64, "base64");
}

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw Object.assign(new Error(`${field} is required.`), { status: 400 });
  }

  return value.trim();
}

function requiredObject(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw Object.assign(new Error(`${field} is required.`), { status: 400 });
  }

  return value;
}

function optionalString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalNumber(value, fallback) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function sendJson(response, status, payload) {
  sendText(response, status, JSON.stringify(payload, null, 2), "application/json; charset=utf-8");
}

function sendText(response, status, body, contentType) {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": "no-store",
  });
  response.end(body);
}

function statusFromError(error) {
  const status = Number(error?.status);
  return Number.isInteger(status) && status >= 400 && status < 600 ? status : 500;
}
