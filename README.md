# OnAI SDK

Server-side TypeScript SDK for Santos image-generation workflows.

The single SDK guide is [docs/LEGACY_DOCUMENT.md](docs/LEGACY_DOCUMENT.md). It includes installation, configuration, request headers, uploads, products, characters, image generation, beta video generation, raw GraphQL, security rules, and maintenance policy.

```bash
npm install github:mxhiraz/onai-sdk#v0.1.6
```

For local development:

```bash
npm install
npm run build
npm run sample:server
```

Use this SDK from server-side code only. Do not expose refresh tokens, Firebase API keys, signed upload URLs, or workspace credentials in browser code.
