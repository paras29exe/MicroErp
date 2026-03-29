-- CreateEnum
CREATE TYPE "UserAuditAction" AS ENUM ('USER_CREATED', 'USER_UPDATED', 'ROLE_CHANGED', 'USER_DEACTIVATED', 'USER_ACTIVATED', 'USER_DELETED', 'PROFILE_UPDATED', 'PASSWORD_CHANGED');

-- CreateTable
CREATE TABLE "user_audits" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "actorUserId" INTEGER,
    "action" "UserAuditAction" NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_audits_userId_createdAt_idx" ON "user_audits"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "user_audits_actorUserId_createdAt_idx" ON "user_audits"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_audits" ADD CONSTRAINT "user_audits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audits" ADD CONSTRAINT "user_audits_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
