# Roshan Rozgar (روشن روزگار)

COMSATS AI Web Forge Hackathon MVP — responsive web marketplace connecting nearby skilled tradespeople with households in Islamabad.

**Tagline:** Good work. Brighter tomorrows.

**Design inspiration:** Skillconnect Figma (emerald/mint, voice-first). Product rules follow the Roshan Rozgar PRD. **No online payments.**

## Stack

- **Next.js 15** (App Router) + TypeScript + Tailwind CSS v4
- **Prisma** + **SQLite** (transactional booking + dispatch sessions)
- **Socket.IO** via custom [`server.mjs`](server.mjs) for live dispatch/offers
- **Zod** validation on API routes
- **AI:** Web Speech + heuristic/OpenAI extract
- **Geo:** Haversine + bounding-box prefilter (SQLite — not PostGIS)

## Quick start (local testing — recommended)

This is the supported way to demo the full inDrive-style flow (API + Socket.IO + dispatch ticker):

```bash
npm install
npm run setup
npm run dev
```

Open **http://localhost:3000** (or the `Network:` URL printed in the terminal for phone testing on the same Wi‑Fi).

> `npm run dev` / `npm run start` run **`server.mjs`** — Next.js + Socket.IO + dispatch ticker in one process.  
> Do **not** use plain `next start` for realtime demos.

Copy [`.env.example`](.env.example) → `.env` if you want to tweak ports/dispatch settings.

Windows production-like start (still local Node, not Vercel Socket.IO):

```bash
npm run build
npm run start:win
```

### Vercel note

[`vercel.json`](vercel.json) is for Next.js hosting. Vercel does **not** run `server.mjs`. For hackathon testing, keep using local `npm run dev`. UI polling still works without sockets; live alerts need `server.mjs`.

## Dispatch demo script (inDrive-style)

1. **Worker tab:** Available for Jobs **ON** → allow location (seeded workers already have fresh coords).
2. **Customer tab:** Post plumbing job in **F-10**, budget Rs. 1500 → Finding Nearby Workers.
3. Worker receives **New Job Near You** alert / inbox → Send Offer (price + ETA).
4. Customer **Compare offers** → Accept one → You’re all set booking.
5. Other offerers get `not_selected`; second accept returns **409**.

## Islamabad locations

[`lib/geo.ts`](lib/geo.ts) includes F/G/I/E/H/D sectors plus Blue Area, Bahria, DHA, PWD, markets, etc. Customer home can expand “Show all areas”.

## Env vars

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite |
| `DISPATCH_RADIUS_STAGES` | `3,5,10,15` | km stages |
| `DISPATCH_EXPAND_INTERVAL_SEC` | `30` | expand delay |
| `DISPATCH_LOCATION_FRESHNESS_SEC` | `120` | stale cutoff |
| `DISPATCH_REQUEST_TTL_SEC` | `900` | request lifetime |
| `DISPATCH_OFFER_DEADLINE_SEC` | `300` | offer TTL |
| `DISPATCH_TICKER_MS` | `5000` | server tick |
| `DISPATCH_TICK_SECRET` | `local-dev-tick` | tick API auth |
| `DISPATCH_VERIFICATION_REQUIRED` | off | require verified workers |
| `OPENAI_API_KEY` | — | optional AI |
| `FCM_*` | — | **not wired** — inbox + socket only |

## Real vs simulated

**Real**

- Progressive nearby dispatch sessions (DB-backed)
- Worker availability + location freshness
- Competing offers + atomic accept (`Booking.requestId` unique)
- Socket.IO events + 2–3s poll fallback
- Opportunity inbox after reconnect

**Simulated / disclosed**

- Demo auth headers / role switch
- Seeded workers & reviews
- No FCM background push unless you add it later
- SQLite Haversine (not PostGIS indexes)

## Geo tradeoff

SQLite cannot use PostGIS. Matching uses a degree bounding box then Haversine km. Fine for Islamabad demo scale; migrate to Postgres+PostGIS for production-scale geospatial indexes.

## APIs (dispatch)

- `POST /api/service-requests` (`startDispatch`, budget, title, area)
- `POST/GET/PATCH /api/dispatch/sessions…`
- `POST /api/workers/[id]/location`
- `GET /api/workers/me/opportunities`
- `POST/GET /api/offers`, `PATCH /api/offers/[id]`, `POST /api/offers/[id]/accept`
- `POST /api/dispatch/tick` (internal ticker)

## Socket events

Server→client: `job:new_request`, `job:request_expired`, `job:request_cancelled`, `offer:accepted`, `offer:not_selected`, `dispatch:started`, `dispatch:radius_expanded`, `dispatch:no_workers`, `offer:received`, `offer:updated`, `offer:withdrawn`, `booking:confirmed`.

## Tests

```bash
npm test
```

Vitest covers match exclusions (trade/offline/stale), idempotent notify, duplicate offer block, atomic accept, cancelled offer reject.

## License

Hackathon submission — educational use.
