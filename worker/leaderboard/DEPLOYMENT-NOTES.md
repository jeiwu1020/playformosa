# Exact existing Preview integration (QA configuration prepared, not yet live)

Existing `wrangler.jsonc`: name `playformosa`, current `previews:{}`; stable existing branch Preview `preview-hurdles`, origin `https://preview-hurdles-playformosa.playformosa.workers.dev` verified in prior publication receipt. This is not a new Worker/project or Wrangler `[env]` name.

User created only `playformosa-leaderboard-qa` and executes reviewed `0001.sql` once in the empty QA D1 Console. UUID75be2ba1-d2b8-455d-82c2-e5392ead01d4 and schema success were confirmed by user. No dashboard binding edits are requested. Repo is binding source of truth.

With ID/schema confirmation, this integration patch adds `main:worker/leaderboard/index.mjs`, retain current static asset config and `404-page`, add ASSETS binding, selective `run_worker_first` for `/api/leaderboard*`, and under `previews` add D1 binding `DB` to that exact UUID/name plus vars `LEADERBOARD_SCOPE=qa`, `LEADERBOARD_ENABLED=true`, `LEADERBOARD_ORIGIN=https://preview-hurdles-playformosa.playformosa.workers.dev`. No top-level production D1 binding/vars. No invented UUID placeholders deployed. Other branch Preview origins are refused server-side even if they inherit the same config. Only this approved preview can submit/read; production later requires a distinct DB and explicit main approval.

Current official Workers Previews docs require Wrangler4.135+ and explicitly say D1 rows are shared if database_id shared; `previews.d1_databases` config is mandatory. Do not confuse old Version URLs, local `preview_database_id`, or `[env]` deployments with this existing Worker Preview. Migration CLI would need a separate config containing top-level QA binding; we are not running CLI or requesting tokens because dashboard SQL init is sufficient and exact current account has no authenticated tool access.

References verified2026-11-02:
- https://developers.cloudflare.com/workers/previews/resources/
- https://developers.cloudflare.com/workers/previews/configuration/
- https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- https://developers.cloudflare.com/d1/get-started/

Free account is confirmed by user, not inferred from a website Free badge. Remain on Free, never upgrade. The user created/initialized the QA database. This local implementation has not deployed or mutated a remote binding yet. Root approved both gates true in one QA release, followed by strict live API/submit/read checks and immediate repair/client-disable on backend failure.
