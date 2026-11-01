-- CreateEnum
CREATE TYPE "AllowedSourceType" AS ENUM ('WEBSITE', 'YOUTUBE', 'APPLICATION_PDF', 'VIDEO_MP4', 'VIDEO_WEBM', 'AUDIO_MP3', 'AUDIO_M4A', 'CSV', 'GITHUB', 'JSON', 'JSONLINES', 'TEXT', 'DOCX', 'EPUB', 'PPTX', 'SUBTITLES');

-- CreateEnum
CREATE TYPE "AllowedNoteType" AS ENUM ('CHAT_NOTE', 'EDITABLE_NOTE', 'AUDIO_OVERVIEW', 'VIDEO_OVERVIEW', 'MIND_MAP', 'FAQ', 'TIMELINE', 'BRIEFING_DOC', 'PRESENTATION', 'INFOGRAPHIC', 'QUIZ', 'FLASH_CARDS');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PROCESSING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "Notebook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notebook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "sourceTitle" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "type" "AllowedSourceType" NOT NULL,
    "url" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "noteTitle" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "AllowedNoteType" NOT NULL,
    "notebookId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL DEFAULT 'user',
    "parts" JSONB[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Notebook" ADD CONSTRAINT "Notebook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_notebookId_fkey" FOREIGN KEY ("notebookId") REFERENCES "Notebook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
