/*
  Warnings:

  - You are about to drop the column `transcript` on the `transcript_sessions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."transcript_sessions" DROP COLUMN "transcript",
ADD COLUMN     "transcriptInput" TEXT,
ADD COLUMN     "transcriptOutput" TEXT;
