/*
  Warnings:

  - Added the required column `paymentStatus` to the `purchases` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "paymentStatus" TEXT NOT NULL;
