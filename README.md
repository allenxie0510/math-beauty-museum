# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

The public experience currently includes four WebGL exhibition halls, the
mathematics garden, an interactive creative workshop, and the hometown
mathematics museum. The workshop is implemented in
`app/InteractiveWorkshop.tsx`: a lazy-loaded, cool-gray Three.js gallery uses
circular wall displays as activity entrances. Its first activity is a
pointer- and touch-driven paper-cutting canvas with selectable radial repeats
and an animated unfold; a functional non-WebGL entrance remains available.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

## Production deployment

The active production stack is intentionally single-source:

- Vercel runs the application (`npm run build:vercel`).
- Supabase is the only actively maintained data, media, and teacher-auth backend.
- `math.ahaslope.com` is the canonical public domain.

The Vercel deployment uses Supabase for the hometown exhibition workflow. Copy
`.env.example` into the deployment environment and set all three variables.
The publishable key is used by the browser for email sign-in; the service-role
key is server-only and must never use a `NEXT_PUBLIC_` prefix.

Apply `supabase/migrations/202608140001_hometown_math.sql` before the first
Vercel deployment. Its private `hometown-media` bucket is served through the
same-origin media route, so public exhibitions do not expose privileged keys.

The previous Sites + D1 + R2 path remains in the repository only as a frozen
rollback target. Do not add features, write data, or run migrations against it.
It can still be checked with `npm run build:sites` while the rollback window is
kept, but production releases should deploy only the verified Vercel build.

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)

## Xiao Pi: explicit opt-in and operating limits

Updated 2026-10-08. Every new page starts with Xiao Pi in `quiet` mode, including
visitors who previously saved `balanced` or `active`. Only cooldown and character
position preferences persist. Ordinary clicks, keyboard activity, scrolling,
and opening the character settings do not enable microphone capture, recognition,
AI decisions, or speech. Choosing Balanced/Active explicitly enables assistance
for that page; reloading starts quietly again. Muting cancels pending decisions,
voice sessions and speech, including a microphone request that completes late.

The active AI provider is Alibaba Cloud DashScope/Qwen, not OpenAI. The four
observer routes perform decision generation, question answering, ASR and TTS.
Text is billed by the applicable model's token usage, ASR by its audio pricing,
and TTS by its synthesis pricing. A decision returning `silent` can still consume
billable model usage. Frontend silence prevents normal automatic calls but does
not disable the public server endpoints. Existing protection is a per-IP,
per-process 60-second window (decide 24, ask 20, listen 18, speech 36); it is neither
a distributed limiter nor a global spending cap. School networks sharing one IP
may share those buckets. Before broad AI rollout, add distributed user/session
quotas and a server-side daily budget/kill switch.

Capacity is not a fixed number of open browser tabs. Most exhibit rendering and
math computation run on visitors' devices; page/assets use Vercel, and hometown
content/auth/media use Supabase. The platform's function-concurrency ceiling is
not a tested visitor-capacity claim. Neither the account plans, actual Qwen model
overrides, account quotas nor load-test results were available in this audit.
For illustration only: the published `qwen3-asr-flash` default is 100 requests/min;
at two recognition calls per person per minute, ASR alone permits roughly 50
active speakers before accounting for bursts, retries, other callers and the
answer/TTS bottlenecks. This is not a production capacity guarantee.

References: [Vercel function limits](https://vercel.com/docs/functions/limitations),
[DashScope rate limits](https://help.aliyun.com/zh/model-studio/rate-limit),
[DashScope model pricing](https://help.aliyun.com/zh/model-studio/model-pricing).

Validation: 40 tests and both build targets passed; targeted ESLint passed.
Ego Lite verified a legacy Active preference still starts Quiet; navigation and
opening settings produced zero observer requests, zero microphone attempts and
zero wake recognition starts. With mocked microphone/AI services, explicit
activation worked and muting before microphone completion prevented activation.
After reload, Quiet and zero observer resource requests were confirmed again.
No paid AI call was made during QA. See [settings screenshot](docs/qa-observer-quiet.png).
