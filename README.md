# Travel Planner MVP

Next.js 16 travel planning app with AI-powered itinerary generation, place search, trip preview, cost tracking, checklist, public share links, partner booking links, and Vietnamese/English UI.

## Run

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Open http://localhost:3000.

The dev script uses webpack (`next dev --webpack`) because Turbopack cache writes hit disk-space limits in this workspace.

## AI Features

All AI features use an Anthropic-compatible Messages API (DeepSeek by default). Configure in `.env`:

```bash
ANTHROPIC_API_KEY="sk-..."           # required
ANTHROPIC_MODEL="deepseek-v4-flash"  # optional
ANTHROPIC_BASE_URL="https://api.deepseek.com/anthropic"  # optional
```

No database is required for local dev — the in-memory store auto-activates. AI features only need the API key above.

### AI Recommendations (`POST /api/ai/recommendations`)

Select a trip and click **Generate** in the AI panel. Returns 1-3 optimization ideas. Each card has a day selector and time-block buttons to add it as an activity.

### Place Search (`POST /api/ai/search-places`)

In the **Itinerary** tab, type a query (e.g. "temples", "ramen ngon") and press Enter. Returns 3-4 real places with suggested time blocks. Add any result to a day/time block.

### Trip Preview (`POST /api/ai/preview-trip`)

When creating a trip, the AI generates a preview with a suggested title, destination description, and day-by-day plan before the trip is created. Edit the title, review, then confirm.

### Auto-Generate Itinerary (`POST /api/ai/generate-itinerary`)

After a trip is created, the AI auto-populates activities across all days based on destination, dates, travel style, and budget.

## Database

The Prisma schema targets PostgreSQL. Set `DATABASE_URL` in `.env`, then run:

```bash
pnpm db:validate
pnpm db:migrate
pnpm db:seed
```

For hosted deploys, create a PostgreSQL database first and set `DATABASE_URL` in the hosting provider. Deployment should run:

```bash
pnpm db:deploy
pnpm build
```

On Vercel with the Supabase integration, migrations prefer `POSTGRE_SQL_POSTGRES_URL_NON_POOLING` or `POSTGRES_URL_NON_POOLING` when present, while runtime database calls use the pooled app URL from `DATABASE_URL`, `POSTGRE_SQL_POSTGRES_PRISMA_URL`, `POSTGRES_PRISMA_URL`, or `POSTGRES_URL`. The Vercel build command is configured in `vercel.json` to run migrations before `pnpm build`; demo data is inserted by an idempotent SQL migration.

## Partner Links

The booking tab generates outbound hotel searches for Booking.com and Agoda using the selected trip destination, dates, and traveler count.

Optional affiliate tracking environment variables:

```bash
NEXT_PUBLIC_BOOKING_AID=""
NEXT_PUBLIC_AGODA_CID=""
```

Real API booking flows require approved partner credentials and certification from each platform. Without credentials, the app uses public outbound search links only.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test:core
pnpm build
```
