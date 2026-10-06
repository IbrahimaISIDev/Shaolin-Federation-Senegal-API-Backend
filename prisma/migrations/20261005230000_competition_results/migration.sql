-- Résultats de compétition : relation vers le membre, classement obligatoire,
-- unicité (compétition, membre, catégorie), indicateur de publication.
-- Nettoyage préalable : aucune donnée existante ne doit faire échouer la migration
-- (la table n'était alimentée par aucun outil jusqu'ici).
UPDATE "resultats" SET "categorie" = '' WHERE "categorie" IS NULL;
DELETE FROM "resultats" WHERE "classement" IS NULL;
DELETE FROM "resultats" WHERE "memberId" NOT IN (SELECT "id" FROM "members");
DELETE FROM "resultats" a USING "resultats" b
  WHERE a."id" > b."id"
    AND a."competitionId" = b."competitionId"
    AND a."memberId" = b."memberId"
    AND a."categorie" = b."categorie";

-- DropForeignKey
ALTER TABLE "resultats" DROP CONSTRAINT "resultats_competitionId_fkey";

-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "resultatsPublies" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "resultats" ALTER COLUMN "categorie" SET NOT NULL,
ALTER COLUMN "categorie" SET DEFAULT '',
ALTER COLUMN "classement" SET NOT NULL;

-- CreateIndex
CREATE INDEX "resultats_memberId_idx" ON "resultats"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "resultats_competitionId_memberId_categorie_key" ON "resultats"("competitionId", "memberId", "categorie");

-- AddForeignKey
ALTER TABLE "resultats" ADD CONSTRAINT "resultats_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultats" ADD CONSTRAINT "resultats_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

