// Supabase Edge Function: POST /functions/v1/recipes
// Secrets (Supabase → Edge Functions → Secrets): GROQ_API_KEY, optional MISTRAL_API_KEY,
// GROQ_MODEL, MISTRAL_MODEL, AI_DAILY_LIMIT_PER_USER. SUPABASE_URL / SUPABASE_ANON_KEY are built in.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildPrompt, generateRecipes, providersFromEnv } from "./ai.ts";

const ALLOWED_ORIGINS = ["https://lebmojica-byte.github.io", "http://localhost:3000"];
const DAILY_LIMIT = Number(Deno.env.get("AI_DAILY_LIMIT_PER_USER")) || 30;
const MAX_ITEMS = 200;
const DEFAULT_SETTINGS = { diet: "any", course: "any", servings: 2, only_my_ingredients: false };

function cors(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

Deno.serve(async (req) => {
  const headers = cors(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  // Acts as the signed-in user, so RLS limits every query to their own rows.
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Please sign in." }, 401);

  const { data: allowed, error: quotaError } = await supabase.rpc("use_ai_quota", { daily_limit: DAILY_LIMIT });
  if (quotaError) {
    console.error(JSON.stringify({ at: "recipes.quota", user: user.id, error: quotaError.message }));
    return json({ error: "Could not check your daily limit." }, 500);
  }
  if (!allowed) return json({ error: `Daily limit of ${DAILY_LIMIT} recipe requests reached. Try again tomorrow.` }, 429);

  const [{ data: items }, { data: settings }] = await Promise.all([
    supabase.from("pantry_items").select("name, location").limit(MAX_ITEMS),
    supabase.from("user_settings").select("diet, course, servings, only_my_ingredients").limit(1),
  ]);
  if (!items?.length) return json({ error: "Add a few ingredients first." }, 400);

  const providers = providersFromEnv({
    GROQ_API_KEY: Deno.env.get("GROQ_API_KEY"),
    GROQ_MODEL: Deno.env.get("GROQ_MODEL"),
    MISTRAL_API_KEY: Deno.env.get("MISTRAL_API_KEY"),
    MISTRAL_MODEL: Deno.env.get("MISTRAL_MODEL"),
  });
  if (!providers.length) {
    console.error(JSON.stringify({ at: "recipes.config", error: "no GROQ_API_KEY or MISTRAL_API_KEY secret" }));
    return json({ error: "Recipe service is not configured." }, 503);
  }

  const started = Date.now();
  try {
    const out = await generateRecipes(buildPrompt(items, settings?.[0] ?? DEFAULT_SETTINGS), providers);
    console.log(JSON.stringify({ at: "recipes.ok", user: user.id, provider: out.provider, ms: Date.now() - started }));
    return json(out);
  } catch (e) {
    console.error(JSON.stringify({ at: "recipes.fail", user: user.id, ms: Date.now() - started, error: String(e) }));
    return json({ error: "The recipe AI is busy right now. Please try again." }, 502);
  }
});
