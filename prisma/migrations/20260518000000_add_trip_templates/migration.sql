CREATE TABLE IF NOT EXISTS "trip_templates" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "adult_count" INTEGER NOT NULL DEFAULT 2,
  "child_count" INTEGER NOT NULL DEFAULT 0,
  "budget_amount" DECIMAL(12, 2),
  "currency" TEXT NOT NULL DEFAULT 'VND',
  "travel_style" "TravelStyle"[],
  "summary" TEXT NOT NULL,
  "suggested_area" TEXT,
  "cover_image_url" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "trip_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template_days" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "day_number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "template_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template_activities" (
  "id" TEXT NOT NULL,
  "template_day_id" TEXT NOT NULL,
  "time_block" "TimeBlock" NOT NULL,
  "title" TEXT NOT NULL,
  "location_name" TEXT,
  "estimated_cost" DECIMAL(12, 2),
  "notes" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "template_activities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template_cost_items" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "category" "CostCategory" NOT NULL,
  "name" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  CONSTRAINT "template_cost_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "template_checklist_items" (
  "id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "template_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "trip_templates_destination_idx" ON "trip_templates"("destination");
CREATE UNIQUE INDEX IF NOT EXISTS "template_days_template_id_day_number_key" ON "template_days"("template_id", "day_number");
CREATE INDEX IF NOT EXISTS "template_activities_template_day_id_time_block_sort_order_idx" ON "template_activities"("template_day_id", "time_block", "sort_order");
CREATE INDEX IF NOT EXISTS "template_cost_items_template_id_category_idx" ON "template_cost_items"("template_id", "category");
CREATE INDEX IF NOT EXISTS "template_checklist_items_template_id_sort_order_idx" ON "template_checklist_items"("template_id", "sort_order");

ALTER TABLE "template_days" ADD CONSTRAINT "template_days_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "trip_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_activities" ADD CONSTRAINT "template_activities_template_day_id_fkey" FOREIGN KEY ("template_day_id") REFERENCES "template_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_cost_items" ADD CONSTRAINT "template_cost_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "trip_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "template_checklist_items" ADD CONSTRAINT "template_checklist_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "trip_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
