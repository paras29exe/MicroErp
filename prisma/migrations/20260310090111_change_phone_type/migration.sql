/*
  Warnings:

  - The `phone` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `phone` column on the `vendors` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "customers" DROP COLUMN "phone",
ADD COLUMN     "phone" INTEGER;

-- AlterTable
ALTER TABLE "vendors"
ALTER COLUMN "phone" TYPE INTEGER USING "phone"::integer;