# NexGen Studio

A Next.js 14 App Router studio for AI image and video generation, powered by Fal.ai.

## Quick start

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set `FAL_KEY` to your Fal.ai API key.
3. Run `npm run dev` and open http://localhost:3000.

The API routes enqueue work with Fal's queue API and the browser polls for completion. `FAL_KEY` must only be configured on the server and should never use a `NEXT_PUBLIC_` prefix.

## Included

- Dark responsive studio UI with image and video generation modes.
- Fal.ai queue-backed API routes at `/api/generate-image` and `/api/generate-video`.
- Mock local browser profile with 50 starter credits (2 per image, 10 per video).
- Prompt enhancer, output gallery, preview, prompt copy and download actions.

## Production notes

The included auth and credits are a demo-only localStorage mock. Before launching publicly, add a real auth provider and a server-side database/transactional credit ledger. Protect generation routes with authenticated user/session checks, rate limits, request quotas, upload validation, and abuse monitoring. Set `FAL_KEY` in your deployment's encrypted environment variables. Provider model IDs and input schemas can evolve; verify them against your Fal.ai account and current model documentation.
