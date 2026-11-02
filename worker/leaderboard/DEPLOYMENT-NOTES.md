# Selective main promotion — confirmed production configuration

Base main `c1222d33bb805018af59af9265847c72d4fe241b`; reviewed leaderboard source preview `91a34d322201ecc99379922cde0e1c5b0f19ba39`. Existing Worker `playformosa`; exact canonical origin `https://playformosa.playformosa.workers.dev` verified by publisher.

User authorized main promotion and confirmed Workers Free. User created new D1 `playformosa-leaderboard`, UUID `8a0e7263-fe1a-4d98-a276-8603e50d6605`, then confirmed supplied0001.sql succeeded via screenshot698451076e48819195dd5bb12a719faa, reviewed by root. No schema rerun, data migration, new credentials or plan changes performed by us.

Root `d1_databases` binds DB to this exact production database; scope production, canonical origin and server/client gates true. Worker entry `worker/leaderboard/index.mjs`, ASSETS binding and `/api/leaderboard*` run_worker_first retain static directory/html handling/404-page. Repository configuration is authoritative; no duplicate dashboard binding requested.

Preview branch remains unchanged with separate QA D175be2ba1-d2b8-455d-82c2-e5392ead01d4 and existing QA scores. No QA rows or other seven games/portal are included in this release. API uses server binding/scope, never a client-selected environment.

Sole publisher must verify fresh main/before hashes, independent review and durable restore before CAS. Require exact CF success; true production GET JSON on both boards, origin isolation and same-origin gameplay/submit/best checks. No mock fixtures may be uploaded as player scores; any authorized smoke record must be explicitly labeled. Jump cloud WebGL limitation must be reported. On binding failure repair or disable client, never claim completion. Free quota errors must not block gameplay or trigger paid fallback.

References:
- https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- https://developers.cloudflare.com/workers/previews/resources/
- https://developers.cloudflare.com/d1/get-started/
