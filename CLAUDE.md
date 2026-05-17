# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies (runs prisma generate postinstall)
pnpm dev              # Start dev server (webpack, not Turbopack — avoids disk-space issues)
pnpm build            # Production build
pnpm lint             # ESLint (flat config)
pnpm typecheck        # tsc --noEmit
pnpm test:core        # Node.js native test runner for core travel logic
pnpm db:generate      # Prisma client generation
pnpm db:validate      # Prisma schema validation
pnpm db:migrate       # Prisma migrate dev (create/apply migrations)
pnpm db:deploy        # Prisma migrate deploy (production migrations — no drift)
pnpm db:seed          # Run prisma/seed.mjs
```

CI runs `pnpm install --frozen-lockfile`, then `typecheck`, `lint`, `test:core`, and `build` in sequence on every push/PR to `main`.

## Architecture

**Next.js 16 App Router** travel planning app with Vietnamese/English UI. Single-page SPA anchored at `src/app/page.tsx` (`TravelPlannerApp` component) plus a public read-only share page at `/shared/[shareToken]`.

### Data persistence: dual-store pattern

The facade at [src/server/travel-store.ts](src/server/travel-store.ts) auto-selects a backend at runtime:

- **No `DATABASE_URL`** → in-memory store ([src/server/memory-travel-store.ts](src/server/memory-travel-store.ts)) — works for local dev without PostgreSQL. Data lives in a `globalThis` singleton, seeded with two demo trips (Tokyo, Seoul).
- **With `DATABASE_URL`** → Prisma/PostgreSQL store ([src/server/prisma-travel-store.ts](src/server/prisma-travel-store.ts)) — full persistence with `@prisma/adapter-pg`. Uses a single `dev-user` ID (`TRAVEL_PLANNER_DEV_USER_ID` env var, defaults to `"dev-user"`) for all trips; upserts the user on first access.

Both stores implement the same interface (list/get/create/update/delete for trips, activities, costs, checklist, share). The facade lazy-loads via dynamic `import()`, so the memory store is never bundled when the Prisma store is used in production.

When adding a new domain operation, add the method to both `memory-travel-store.ts` and `prisma-travel-store.ts`, then re-export it from the facade.

### Prisma schema (PostgreSQL)

**Core domain models:** `Trip` → `ItineraryDay` → `Activity` (cascading deletes). `CostItem` and `ChecklistItem` hang directly off `Trip`. `TripShare` is 1:1 with `Trip` (unique `tripId`, unique `shareToken`).

**Auth models (from NextAuth):** `User`, `Account`, `Session`, `VerificationToken` — standard NextAuth schema. Currently auth routes are not wired up; the Prisma store uses a single dev user.

**Enums:** `TravelStyle` (7 values), `TimeBlock` (4 values), `CostCategory` (7 values), `SharePermission` (only `VIEWER`).

**Key gotcha:** Enum values in the DB use `UPPER_SNAKE_CASE` (e.g., `CHECK_IN`, `LOCAL_TRANSPORT`). The Prisma store maps between these and the app's kebab-case values (`check-in`, `local-transport`) using bidirectional lookup tables. The `travelStyle` column is `TravelStyle[]` (native Postgres enum array).

### API route patterns

All routes live under `src/app/api/`. Each route file exports `GET`/`POST`/`PATCH`/`DELETE` as named functions following Next.js App Router conventions. Request bodies are parsed with `readJson()` from [src/server/api-response.ts](src/server/api-response.ts). Responses use `ok(data)` for 200/201 and `fail(code, message, status)` for errors.

Route params are accessed via `await context.params` (Next.js 16 async params). The `ParamsContext<T>` helper type wraps this.

**Route structure:**
- `GET/POST /api/trips` — list all, create new
- `GET/PATCH/DELETE /api/trips/[tripId]` — single trip CRUD
- `POST /api/trips/[tripId]/costs` — add cost item
- `GET /api/trips/[tripId]/cost-summary` — aggregated cost summary
- `POST /api/trips/[tripId]/checklist` — add checklist item
- `POST/PATCH /api/trips/[tripId]/share` — enable/update sharing
- `POST /api/itinerary-days/[dayId]/activities` — add activity to day
- `PATCH /api/itinerary-days/[dayId]/activities/reorder` — reorder activities
- `PATCH/DELETE /api/activities/[activityId]` — update/delete activity
- `PATCH/DELETE /api/costs/[costId]` — update/delete cost
- `PATCH/DELETE /api/checklist/[itemId]` — update/delete checklist item
- `GET /api/shared/[shareToken]` — public read-only trip view (returns sanitized `PublicTrip` DTO — no internal IDs)

### Validation

Zod schemas in [src/server/validation/trip.ts](src/server/validation/trip.ts) validate trip creation/update payloads. On validation failure, a `ValidationError` is thrown and caught by API routes, which convert it to a `400 BAD_REQUEST` response. Non-`ValidationError` exceptions show a generic message in production but the real message in dev.

### Client-side

The `travelApi` object in [src/lib/api.ts](src/lib/api.ts) is the typed HTTP client — every API endpoint has a corresponding method. The `TravelPlannerApp` component manages all state (selected trip, tab, locale) and calls `travelApi` methods directly. No separate state management library — React `useState` + prop drilling is sufficient for this scope.

### i18n

[src/lib/i18n.ts](src/lib/i18n.ts) provides a `uiText` object with `vi`/`en` keys for all UI strings, plus label mappers for `TravelStyle`, `TimeBlock`, and `CostCategory` enums. The locale is stored in component state, not in the URL.

### Partner booking links

[src/lib/integrations.ts](src/lib/integrations.ts) builds outbound search URLs for Booking.com and Agoda using trip destination, dates, and traveler count. Affiliate IDs (`NEXT_PUBLIC_BOOKING_AID`, `NEXT_PUBLIC_AGODA_CID`) are optional and only prefixed client-side.

### Public sharing

`TripShare` model holds a unique `shareToken`. When enabled, `GET /api/shared/:token` returns a sanitized `PublicTrip` DTO (no internal IDs, limited fields). The shared page at `/shared/[shareToken]` is a read-only view using `SharedTripPage` component.

### Key file summary

| Path | Role |
|------|------|
| `src/lib/travel.ts` | Core types (`Trip`, `Activity`, `CostItem`, etc.), domain logic (itinerary day generation, cost summary, default checklist), and seed data |
| `src/lib/api.ts` | Typed HTTP client (`travelApi`) for all API endpoints |
| `src/lib/i18n.ts` | All UI strings and enum label mappers for `vi`/`en` |
| `src/lib/integrations.ts` | Partner outbound search link builder |
| `src/lib/public-trip.ts` | `PublicTrip` DTO types (sanitized for shared view) |
| `src/lib/ai-recommendations.ts` | `AiRecommendation` types (API route exists but AI integration is not yet implemented) |
| `src/server/travel-store.ts` | Facade: auto-selects memory or Prisma store |
| `src/server/memory-travel-store.ts` | In-memory CRUD (dev without DB) |
| `src/server/prisma-travel-store.ts` | Prisma/PostgreSQL CRUD |
| `src/server/api-response.ts` | Response helpers (`ok`, `fail`, `readJson`), type guards |
| `src/server/errors.ts` | `ValidationError` class and `toClientErrorMessage` |
| `src/server/validation/trip.ts` | Zod schema for trip draft input |
| `src/server/db.ts` | Prisma client singleton with `@prisma/adapter-pg` |
| `src/server/public-trip.ts` | `toPublicTripDto` mapper |
| `src/components/travel-planner-app.tsx` | Main SPA component (all tabs, all state) |
| `src/components/shared-trip-page.tsx` | Read-only shared trip view |
| `prisma/schema.prisma` | Database schema |
| `tests/travel-core.test.mjs` | Core domain logic tests (Node.js native test runner) |

### Environment variables

See `.env.example`. Required for database: one of `DATABASE_URL`, `POSTGRE_SQL_POSTGRES_PRISMA_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, `POSTGRE_SQL_POSTGRES_URL_NON_POOLING`, `POSTGRES_URL_NON_POOLING`. Migrations on Vercel prefer the non-pooling variants; runtime prefers pooled URLs.

The dev server does not require a database — the memory store kicks in automatically when no DB URL is set.
