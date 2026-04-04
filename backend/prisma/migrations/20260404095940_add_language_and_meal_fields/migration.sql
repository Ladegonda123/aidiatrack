-- AlterTable
ALTER TABLE "diet_recommendations" ADD COLUMN     "recommendation_text_rw" TEXT;

-- AlterTable
ALTER TABLE "health_records" ADD COLUMN     "meal_calories" INTEGER,
ADD COLUMN     "meal_gi" INTEGER,
ADD COLUMN     "minutes_since_meal" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'rw';
