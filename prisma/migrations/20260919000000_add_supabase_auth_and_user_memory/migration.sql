-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('PREFERENCE', 'LEARNING_CONTEXT', 'GOAL', 'SKILL', 'DIFFICULTY', 'STUDY_HABIT', 'INTEREST');

-- AlterTable User (make passwordHash optional, add authUserId and memoryEnabled)
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "authUserId" TEXT;
ALTER TABLE "User" ADD COLUMN "memoryEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable UserMemory
CREATE TABLE "UserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "memoryType" "MemoryType" NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'CONVERSATION',
    "sourceConversationId" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "UserMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex on User
CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");
CREATE INDEX "User_authUserId_idx" ON "User"("authUserId");

-- CreateIndex on UserMemory
CREATE UNIQUE INDEX "UserMemory_userId_memoryType_key_key" ON "UserMemory"("userId", "memoryType", "key");
CREATE INDEX "UserMemory_userId_memoryType_idx" ON "UserMemory"("userId", "memoryType");
CREATE INDEX "UserMemory_userId_updatedAt_idx" ON "UserMemory"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "UserMemory" ADD CONSTRAINT "UserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMemory" ADD CONSTRAINT "UserMemory_sourceConversationId_fkey" FOREIGN KEY ("sourceConversationId") REFERENCES "AIConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Enable Row Level Security on UserMemory
ALTER TABLE "UserMemory" ENABLE ROW LEVEL SECURITY;

-- Create policy for UserMemory
CREATE POLICY "Users can manage their own memories" ON "UserMemory"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = "UserMemory"."userId"
            AND u."authUserId" = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User" u
            WHERE u.id = "UserMemory"."userId"
            AND u."authUserId" = auth.uid()::text
        )
    );
