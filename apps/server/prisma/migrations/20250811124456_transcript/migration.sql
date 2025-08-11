-- CreateEnum
CREATE TYPE "public"."SessionStatus" AS ENUM ('ACTIVE', 'ENDED', 'ERROR');

-- CreateTable
CREATE TABLE "public"."transcript_sessions" (
    "id" TEXT NOT NULL,
    "socketId" TEXT NOT NULL,
    "languageCode" TEXT NOT NULL DEFAULT 'en-US',
    "transcript" TEXT,
    "status" "public"."SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transcript_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transcript_sessions_socketId_key" ON "public"."transcript_sessions"("socketId");
