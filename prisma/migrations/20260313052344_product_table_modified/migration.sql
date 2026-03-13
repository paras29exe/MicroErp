/*
  Warnings:

  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "price",
DROP COLUMN "stock",
ADD COLUMN     "restockLevel" INTEGER NOT NULL DEFAULT 0;
