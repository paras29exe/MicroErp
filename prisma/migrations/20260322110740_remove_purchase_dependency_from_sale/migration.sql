/*
  Warnings:

  - You are about to drop the column `purchaseId` on the `sales` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_purchaseId_fkey";

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "purchaseId";
