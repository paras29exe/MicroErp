-- AlterEnum
ALTER TYPE "UserAuditAction" ADD VALUE 'PERMISSION_GRANTED';
ALTER TYPE "UserAuditAction" ADD VALUE 'PERMISSION_DENIED';
ALTER TYPE "UserAuditAction" ADD VALUE 'PERMISSION_REVOKED';

-- CreateEnum
CREATE TYPE "PermissionOverrideEffect" AS ENUM ('GRANT', 'DENY');

-- CreateTable
CREATE TABLE "user_permission_overrides" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permission" TEXT NOT NULL,
    "effect" "PermissionOverrideEffect" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "reason" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedById" INTEGER,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "user_permission_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_permission_overrides_userId_permission_revokedAt_idx" ON "user_permission_overrides"("userId", "permission", "revokedAt");

-- CreateIndex
CREATE INDEX "user_permission_overrides_userId_revokedAt_expiresAt_idx" ON "user_permission_overrides"("userId", "revokedAt", "expiresAt");

-- CreateIndex
CREATE INDEX "user_permission_overrides_createdById_createdAt_idx" ON "user_permission_overrides"("createdById", "createdAt");

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permission_overrides" ADD CONSTRAINT "user_permission_overrides_revokedById_fkey" FOREIGN KEY ("revokedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
