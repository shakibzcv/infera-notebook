-- CreateTable
CREATE TABLE "_NoteToSource" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_NoteToSource_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_NoteToSource_B_index" ON "_NoteToSource"("B");

-- AddForeignKey
ALTER TABLE "_NoteToSource" ADD CONSTRAINT "_NoteToSource_A_fkey" FOREIGN KEY ("A") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_NoteToSource" ADD CONSTRAINT "_NoteToSource_B_fkey" FOREIGN KEY ("B") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
