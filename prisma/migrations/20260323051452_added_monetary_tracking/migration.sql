/*
  Warnings:

  - You are about to drop the column `costPrice` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `profit` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `sales` table. All the data in the column will be lost.
  - You are about to drop the column `costPrice` on the `sales_items` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `sales_items` table. All the data in the column will be lost.
  - Added the required column `grossProfit` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `grossSales` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCogs` to the `sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitCost` to the `sales_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitSellingPrice` to the `sales_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "avgCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "stockValue" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "stockAfter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stockAvgCostAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "stockValueAfter" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "production" ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "costPrice";

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "costPrice",
DROP COLUMN "profit",
DROP COLUMN "sellingPrice",
ADD COLUMN     "grossProfit" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "grossSales" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "totalCogs" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "sales_items" DROP COLUMN "costPrice",
DROP COLUMN "sellingPrice",
ADD COLUMN     "unitCost" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "unitSellingPrice" DOUBLE PRECISION NOT NULL;
