// Post-build: GitHub Pages can't send headers, so each exported page gets a
// <meta> CSP that allows exactly its own inline scripts (by sha256 hash), no 'unsafe-inline'.
// Limits of meta CSP: frame-ancestors / X-Frame-Options / HSTS can't be set this way.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";

// Plain node doesn't read .env.local; Next's own loader does (same files as `next build`).
nextEnv.loadEnvConfig(process.cwd());

const OUT = "out";
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!SUPABASE) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing at build time");

const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
const sha = (s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`;

function csp(hashes) {
  return [
    "default-src 'self'",
    `script-src 'self' ${hashes.join(" ")} https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self' ${SUPABASE}`,
    "frame-src https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".html")) files.push(p);
  }
})(OUT);

for (const file of files) {
  let html = readFileSync(file, "utf8");
  if (html.includes('http-equiv="Content-Security-Policy"')) throw new Error(`${file} already has a CSP`);
  const bodies = [...html.matchAll(INLINE_SCRIPT)].map((m) => m[1]);
  const hashes = [...new Set(bodies.filter(Boolean).map(sha))];
  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp(hashes)}">`;
  const head = html.match(/<head[^>]*>/);
  if (!head) throw new Error(`${file} has no <head>`);
  html = html.replace(head[0], head[0] + meta);
  // Self-check: the CSP must come before the first script and cover every inline one.
  const metaAt = html.indexOf(meta);
  const firstScript = html.indexOf("<script");
  if (firstScript !== -1 && firstScript < metaAt) throw new Error(`${file}: script before CSP meta`);
  for (const b of bodies.filter(Boolean)) if (!meta.includes(sha(b))) throw new Error(`${file}: unhashed inline script`);
  writeFileSync(file, html);
  console.log(`csp: ${file} (${hashes.length} inline scripts hashed)`);
}
writeFileSync(join(OUT, ".nojekyll"), ""); // Pages must serve the _next/ folder as-is
