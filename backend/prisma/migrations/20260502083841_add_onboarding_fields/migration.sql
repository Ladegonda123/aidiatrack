-- AlterTable
ALTER TABLE "users" ADD COLUMN     "height_cm" DOUBLE PRECISION,
ADD COLUMN     "is_onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "weight_kg" DOUBLE PRECISION;
