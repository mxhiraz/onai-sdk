# OnAI SDK

Server-side TypeScript SDK for Santos image-generation workflows.

The single SDK guide is [docs/LEGACY_DOCUMENT.md](docs/LEGACY_DOCUMENT.md). It includes installation, configuration, request headers, uploads, products, characters, model search, image generation, beta video generation, raw GraphQL, security rules, and maintenance policy.

```bash
npm install git+ssh://git@github.com/mxhiraz/onai-sdk.git#v0.1.0
```

For local development:

```bash
npm install
npm run build
```

Use this SDK from server-side code only. Do not expose refresh tokens, Firebase API keys, signed upload URLs, or workspace credentials in browser code.
