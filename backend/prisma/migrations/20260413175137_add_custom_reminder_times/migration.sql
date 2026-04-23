/*
  Warnings:

  - You are about to drop the column `daily_reminder_enabled` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "daily_reminder_enabled",
ADD COLUMN     "reminder_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminder_times" TEXT[] DEFAULT ARRAY['07:00', '13:00', '20:00']::TEXT[];
