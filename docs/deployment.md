---
type: Deployment
title: "Deployment"
description: "How the Vibe Coding dashboard is built and deployed"
tags: ["deployment", "cloudflare", "wrangler"]
timestamp: 2026-07-12T00:00:00Z
---

# Deployment

## Requirements

- Node.js 20+
- Cloudflare account
- Wrangler CLI authenticated

## Local development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

## Environment variables

Set these in Cloudflare or via Wrangler secrets:

- `MODEL_MEDITATE`
- `MODEL_AGENCY`
- `MODEL_VC_ROAST`
- `MODEL_ORACLE`

## Domain

The site is deployed at `vibe-coding.shiretechpartners.com.au` with a Cloudflare-managed custom domain.

## Related

- [Project overview](./project.md)
- [Architecture](./architecture.md)
- [Security Controls](./security.md)
