# Travel Planner MVP

Next.js travel planning MVP with trip management, itinerary blocks, cost tracking, checklist, public share links, partner booking links, and Vietnamese/English UI switching.

## Run

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Open http://localhost:3000.

The dev script uses webpack (`next dev --webpack`) because Turbopack cache writes hit disk-space limits in this workspace.

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
