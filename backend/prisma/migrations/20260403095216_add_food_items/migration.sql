-- CreateTable
CREATE TABLE "food_items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_kin" TEXT,
    "category" TEXT NOT NULL,
    "glycemic_index" INTEGER,
    "glycemic_load" DOUBLE PRECISION,
    "calories_per_100g" DOUBLE PRECISION,
    "carbs_per_100g" DOUBLE PRECISION,
    "protein_per_100g" DOUBLE PRECISION,
    "fat_per_100g" DOUBLE PRECISION,
    "is_local" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "food_items_pkey" PRIMARY KEY ("id")
);
