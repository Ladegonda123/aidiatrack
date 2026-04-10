/*
  Warnings:

  - You are about to drop the column `name_kin` on the `food_items` table. All the data in the column will be lost.
  - You are about to alter the column `calories_per_100g` on the `food_items` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[name]` on the table `food_items` will be added. If there are existing duplicate values, this will fail.
  - Made the column `glycemic_index` on table `food_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `glycemic_load` on table `food_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `calories_per_100g` on table `food_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `carbs_per_100g` on table `food_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `protein_per_100g` on table `food_items` required. This step will fail if there are existing NULL values in that column.
  - Made the column `fat_per_100g` on table `food_items` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "food_items" DROP COLUMN "name_kin",
ADD COLUMN     "nameKin" TEXT,
ALTER COLUMN "glycemic_index" SET NOT NULL,
ALTER COLUMN "glycemic_load" SET NOT NULL,
ALTER COLUMN "calories_per_100g" SET NOT NULL,
ALTER COLUMN "calories_per_100g" SET DATA TYPE INTEGER,
ALTER COLUMN "carbs_per_100g" SET NOT NULL,
ALTER COLUMN "protein_per_100g" SET NOT NULL,
ALTER COLUMN "fat_per_100g" SET NOT NULL,
ALTER COLUMN "is_local" SET DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "photo_url" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "food_items_name_key" ON "food_items"("name");
