---
type: Deployment
title: "Deployment"
description: "How the Vibe Coding dashboard is built and deployed"
tags: ["deployment", "cloudflare", "wrangler"]
timestamp: 2026-07-12T00:00:00Z
updated: 2026-07-13T15:00:00Z
---

# Deployment

## Requirements

- Node.js 20+
- Cloudflare account with Workers Paid plan (required for AI Gateway)
- Wrangler CLI authenticated (`wrangler login`)
- GitHub repository access

## Local development

```bash
git clone https://github.com/roman-kulish/overnight-ai-startup.git
cd overnight-ai-startup
npm install
npm run dev
```

Visit `http://localhost:5173` to test the app locally.

## Deploy to Cloudflare

### 1. Clone and prepare

```bash
git clone https://github.com/roman-kulish/overnight-ai-startup.git
cd overnight-ai-startup
npm install
```

### 2. Set up AI Gateways

Each app needs its own AI Gateway for isolated rate limits, spend budgets, and guardrails:

1. Go to [Cloudflare Dashboard → AI → AI Gateway](https://dash.cloudflare.com/?to=/:account/ai/ai-gateway)
2. Create 4 gateways:
   - `meditate` - for Meditate to Your Shares
   - `agency` - for AI Automation Agency Generator
   - `vc-roast` - for VC Roast Pitch Deck
   - `oracle` - for Crypto-Astrology Oracle
3. Note the gateway IDs (format: `account-id/gateway-name`)

### 3. Configure environment variables

Create a `.dev.vars` file for local development:

```bash
MODEL_MEDITATE=@cf/meta/llama-3.2-3b-instruct
MODEL_AGENCY=@cf/meta/llama-3.1-8b-instruct-fp8-fast
MODEL_VC_ROAST=@cf/mistralai/mistral-small-3.1-24b-instruct
MODEL_ORACLE=@cf/meta/llama-3.1-8b-instruct-fp8-fast

AI_GATEWAY_MEDITATE=your-account-id/meditate
AI_GATEWAY_AGENCY=your-account-id/agency
AI_GATEWAY_VC_ROAST=your-account-id/vc-roast
AI_GATEWAY_ORACLE=your-account-id/oracle
```

For production, set these as Cloudflare secrets:

```bash
wrangler secret put MODEL_MEDITATE
wrangler secret put MODEL_AGENCY
wrangler secret put MODEL_VC_ROAST
wrangler secret put MODEL_ORACLE
wrangler secret put AI_GATEWAY_MEDITATE
wrangler secret put AI_GATEWAY_AGENCY
wrangler secret put AI_GATEWAY_VC_ROAST
wrangler secret put AI_GATEWAY_ORACLE
```

### 4. Deploy

```bash
npm run deploy
```

This runs `wrangler deploy` which:
- Builds the frontend with Vite
- Bundles the Worker with esbuild
- Uploads static assets to Cloudflare Pages
- Deploys the Worker to Cloudflare's edge

### 5. Configure custom domain (optional)

1. Go to [Cloudflare Dashboard → Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. Select your worker (`overnight-ai-startup`)
3. Go to **Settings → Triggers**
4. Add a custom route: `vibe-coding.shiretechpartners.com.au/*`
5. Ensure the domain is added to your Cloudflare account and DNS is configured

## Continuous deployment with GitHub

To auto-deploy on push to `main`:

1. Go to [Cloudflare Dashboard → Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages)
2. Click **Create application → Pages → Connect to Git**
3. Select your GitHub repository
4. Configure build settings:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: `/`
5. Add environment variables in the Pages dashboard
6. Save and deploy

Cloudflare will now auto-deploy on every push to `main`.

## Environment variables reference

### Model bindings

| Variable | App | Recommended model |
|----------|-----|-------------------|
| `MODEL_MEDITATE` | Meditate to Your Shares | `@cf/meta/llama-3.2-3b-instruct` |
| `MODEL_AGENCY` | AI Automation Agency Generator | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` |
| `MODEL_VC_ROAST` | VC Roast Pitch Deck | `@cf/mistralai/mistral-small-3.1-24b-instruct` |
| `MODEL_ORACLE` | Crypto-Astrology Oracle | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` |

### AI Gateway IDs

| Variable | Gateway name |
|----------|--------------|
| `AI_GATEWAY_MEDITATE` | `meditate` |
| `AI_GATEWAY_AGENCY` | `agency` |
| `AI_GATEWAY_VC_ROAST` | `vc-roast` |
| `AI_GATEWAY_ORACLE` | `oracle` |

## Troubleshooting

### "AI Gateway not found"

- Verify the gateway ID format: `account-id/gateway-name`
- Check that the gateway exists in your Cloudflare account
- Ensure your Workers Paid plan is active (AI Gateway requires paid plan)

### Streaming not working in production

- Check that response headers include `cache-control: no-cache, no-transform`
- Verify no CDN or proxy is buffering the response
- Test with `curl -N` to see streaming in terminal

### Build fails with TypeScript errors

- Run `npm run typecheck` locally to catch errors before deploying
- Ensure all environment variables are set in Cloudflare dashboard

## Domain

The site is deployed at `vibe-coding.shiretechpartners.com.au` with a Cloudflare-managed custom domain.

## Related

- [Project overview](./project.md)
- [Architecture](./architecture.md)
- [Security Controls](./security.md)
