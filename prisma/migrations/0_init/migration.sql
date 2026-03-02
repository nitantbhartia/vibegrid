-- CreateTable
CREATE TABLE "purchases" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "x_handle" TEXT,
    "app_name" VARCHAR(50) NOT NULL,
    "app_url" TEXT,
    "description" VARCHAR(140),
    "thumbnail_url" TEXT,
    "blocks_x_start" INTEGER NOT NULL,
    "blocks_y_start" INTEGER NOT NULL,
    "blocks_x_end" INTEGER NOT NULL,
    "blocks_y_end" INTEGER NOT NULL,
    "block_count" INTEGER NOT NULL,
    "price_per_block" INTEGER NOT NULL,
    "total_price" INTEGER NOT NULL,
    "stripe_session_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchases_stripe_session_id_key" ON "purchases"("stripe_session_id");

-- CreateIndex
CREATE INDEX "purchases_status_idx" ON "purchases"("status");

