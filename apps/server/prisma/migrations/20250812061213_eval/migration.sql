-- CreateTable
CREATE TABLE "public"."evaluations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "evalJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_sessionId_key" ON "public"."evaluations"("sessionId");
