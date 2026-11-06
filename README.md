# Pantry Chef

Add what's in your fridge, pantry, spice rack and fresh herbs, pick a diet and a type of dish,
get three AI recipes. Live at https://lebmojica-byte.github.io/pantry-chef/

## How it fits together

- **Frontend:** Next.js static export (`output: "export"`), served by GitHub Pages under `/pantry-chef`.
  Login and data access run in the browser with the Supabase publishable key; RLS keeps every row per user.
- **Database:** Supabase, schema in `supabase/migrations/0001_init.sql` (tables, RLS, daily AI quota).
- **AI:** Supabase Edge Function `supabase/functions/recipes` (Groq first, Mistral fallback).
  The Groq/Mistral keys live only in Supabase secrets, never in this repo or the browser.
- **CSP:** Pages can't send headers, so `scripts/csp.mjs` adds a `<meta>` CSP with sha256 hashes
  of each page's inline scripts after every build.

## Setup

1. Supabase: run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Supabase → Authentication → URL Configuration: Site URL `https://lebmojica-byte.github.io/pantry-chef/`,
   redirect URLs `https://lebmojica-byte.github.io/pantry-chef/` and `http://localhost:3000/`.
3. Edge Function: `supabase functions deploy recipes --project-ref <ref> --use-api`, then add the
   secret `GROQ_API_KEY` (Supabase → Edge Functions → Secrets). Optional: `MISTRAL_API_KEY`,
   `GROQ_MODEL`, `MISTRAL_MODEL`, `AI_DAILY_LIMIT_PER_USER` (default 30).
4. Local: `cp env.example .env.local`, `npm install`, `npm run dev` → http://localhost:3000

## Deploy to GitHub Pages

`npm run build` writes the site to `out/` (with CSP and `.nojekyll`). Publish `out/` to the
`gh-pages` branch, and in the repo choose Settings → Pages → Deploy from branch → `gh-pages` / root.

## Checks

`npm test` (prompt, parsing, provider fallback), `npx tsc --noEmit`, `npx eslint .`, `npm run build`.
