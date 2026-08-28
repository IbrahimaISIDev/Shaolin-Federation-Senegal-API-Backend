-- CreateTable
CREATE TABLE "grade_history" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "ancienGrade" VARCHAR(50),
    "nouveauGrade" VARCHAR(50) NOT NULL,
    "changedById" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grade_history_memberId_idx" ON "grade_history"("memberId");

-- AddForeignKey
ALTER TABLE "grade_history" ADD CONSTRAINT "grade_history_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grade_history" ADD CONSTRAINT "grade_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

