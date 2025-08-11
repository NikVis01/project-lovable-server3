-- AlterTable
ALTER TABLE "public"."transcript_sessions" ADD COLUMN     "audioInputUrl" TEXT,
ADD COLUMN     "audioOutputUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."convai_agents" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "voiceId" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "convai_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "convai_agents_agentId_key" ON "public"."convai_agents"("agentId");
