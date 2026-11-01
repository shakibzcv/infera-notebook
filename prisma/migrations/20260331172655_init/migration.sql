/*
  Warnings:

  - You are about to drop the column `cloudinaryPublicId` on the `Source` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `Source` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[fileId]` on the table `Source` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fileId` to the `Source` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Source" DROP COLUMN "cloudinaryPublicId",
DROP COLUMN "url",
ADD COLUMN     "fileId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_fileId_key" ON "Source"("fileId");

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
