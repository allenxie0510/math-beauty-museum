import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("keeps Sites and Vercel as separate build targets", async () => {
  const [packageJson, viteConfig, vercelConfig] = await Promise.all([
    read("package.json"),
    read("vite.config.ts"),
    read("vercel.json"),
  ]);
  assert.match(packageJson, /"build:sites"/);
  assert.match(packageJson, /"build:vercel"/);
  assert.match(viteConfig, /NITRO_PRESET/);
  assert.match(viteConfig, /sites\(\)/);
  assert.doesNotMatch(vercelConfig, /chatgpt\.site/);
});

test("ships the Supabase hometown schema and dual authentication", async () => {
  const [migration, auth, server, client] = await Promise.all([
    read("supabase/migrations/202608140001_hometown_math.sql"),
    read("app/chatgpt-auth.ts"),
    read("app/hometown-math/services/supabase-server.ts"),
    read("app/hometown-math/services/supabase-client.ts"),
  ]);
  for (const table of [
    "hometown_exhibitions",
    "hometown_zones",
    "hometown_assets",
    "hometown_exhibits",
    "hometown_published_manifests",
  ]) assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
  assert.match(migration, /claim_hometown_exhibitions/);
  assert.match(auth, /oai-authenticated-user-id/);
  assert.match(auth, /\/auth\/v1\/user/);
  assert.match(server, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});
