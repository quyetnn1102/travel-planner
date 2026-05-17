INSERT INTO "users" (
  "id",
  "email",
  "name",
  "created_at",
  "updated_at"
) VALUES (
  'dev-user',
  'demo@travel-planner.local',
  'Demo Traveler',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "email" = EXCLUDED."email",
  "name" = EXCLUDED."name",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "trips" (
  "id",
  "user_id",
  "title",
  "destination",
  "start_date",
  "end_date",
  "adult_count",
  "child_count",
  "budget_amount",
  "currency",
  "travel_style",
  "notes",
  "created_at",
  "updated_at"
) VALUES (
  'trip_seed_da_nang',
  'dev-user',
  'Da Nang family trip',
  'Da Nang, Vietnam',
  DATE '2026-08-10',
  DATE '2026-08-13',
  2,
  1,
  25000000,
  'VND',
  ARRAY['FAMILY', 'FOOD', 'BUDGET']::"TravelStyle"[],
  'Seed trip for local development.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "destination" = EXCLUDED."destination",
  "start_date" = EXCLUDED."start_date",
  "end_date" = EXCLUDED."end_date",
  "adult_count" = EXCLUDED."adult_count",
  "child_count" = EXCLUDED."child_count",
  "budget_amount" = EXCLUDED."budget_amount",
  "travel_style" = EXCLUDED."travel_style",
  "notes" = EXCLUDED."notes",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "itinerary_days" (
  "id",
  "trip_id",
  "day_number",
  "date",
  "title",
  "created_at",
  "updated_at"
) VALUES (
  'day_seed_da_nang_1',
  'trip_seed_da_nang',
  1,
  DATE '2026-08-10',
  'Day 1',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "day_number" = EXCLUDED."day_number",
  "date" = EXCLUDED."date",
  "title" = EXCLUDED."title",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "activities" (
  "id",
  "itinerary_day_id",
  "time_block",
  "start_time",
  "end_time",
  "title",
  "location_name",
  "address",
  "estimated_cost",
  "currency",
  "notes",
  "sort_order",
  "created_at",
  "updated_at"
) VALUES (
  'activity_seed_da_nang_1',
  'day_seed_da_nang_1',
  'AFTERNOON',
  TIME '15:00',
  TIME '16:00',
  'Hotel check-in',
  'My Khe Beach',
  'Da Nang',
  0,
  'VND',
  'Use this as a starter itinerary item.',
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "time_block" = EXCLUDED."time_block",
  "start_time" = EXCLUDED."start_time",
  "end_time" = EXCLUDED."end_time",
  "title" = EXCLUDED."title",
  "location_name" = EXCLUDED."location_name",
  "address" = EXCLUDED."address",
  "estimated_cost" = EXCLUDED."estimated_cost",
  "notes" = EXCLUDED."notes",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "checklist_items" (
  "id",
  "trip_id",
  "title",
  "is_done",
  "category",
  "sort_order",
  "created_at",
  "updated_at"
) VALUES
  (
    'check_seed_da_nang_1',
    'trip_seed_da_nang',
    'Passport or ID',
    false,
    'Preparation',
    0,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'check_seed_da_nang_2',
    'trip_seed_da_nang',
    'Hotel booking',
    false,
    'Preparation',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("id") DO UPDATE SET
  "title" = EXCLUDED."title",
  "is_done" = EXCLUDED."is_done",
  "category" = EXCLUDED."category",
  "sort_order" = EXCLUDED."sort_order",
  "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "cost_items" (
  "id",
  "trip_id",
  "category",
  "name",
  "amount",
  "currency",
  "quantity",
  "notes",
  "created_at",
  "updated_at"
) VALUES (
  'cost_seed_da_nang_1',
  'trip_seed_da_nang',
  'HOTEL',
  'Hotel estimate',
  6000000,
  'VND',
  1,
  'Starter estimate.',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO UPDATE SET
  "category" = EXCLUDED."category",
  "name" = EXCLUDED."name",
  "amount" = EXCLUDED."amount",
  "quantity" = EXCLUDED."quantity",
  "notes" = EXCLUDED."notes",
  "updated_at" = CURRENT_TIMESTAMP;
