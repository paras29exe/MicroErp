/*
  Warnings:

  - You are about to drop the column `price` on the `sales_items` table. All the data in the column will be lost.
  - Added the required column `costPrice` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profit` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchaseId` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `costPrice` to the `sales_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `profit` to the `sales_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellingPrice` to the `sales_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "profit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "purchaseId" INTEGER NOT NULL,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "sales_items" DROP COLUMN "price",
ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "profit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "purchases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
