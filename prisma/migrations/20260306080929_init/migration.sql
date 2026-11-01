/*
  Warnings:

  - The values [PRESENTATION] on the enum `AllowedNoteType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AllowedNoteType_new" AS ENUM ('CHAT_NOTE', 'EDITABLE_NOTE', 'AUDIO_OVERVIEW', 'VIDEO_OVERVIEW', 'MIND_MAP', 'FAQ', 'TIMELINE', 'BRIEFING_DOC', 'SLIDE_DECK', 'INFOGRAPHIC', 'QUIZ', 'FLASH_CARDS');
ALTER TABLE "Note" ALTER COLUMN "type" TYPE "AllowedNoteType_new" USING ("type"::text::"AllowedNoteType_new");
ALTER TYPE "AllowedNoteType" RENAME TO "AllowedNoteType_old";
ALTER TYPE "AllowedNoteType_new" RENAME TO "AllowedNoteType";
DROP TYPE "public"."AllowedNoteType_old";
COMMIT;
