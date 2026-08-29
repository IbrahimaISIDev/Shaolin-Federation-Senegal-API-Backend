-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "orgName" VARCHAR(200) NOT NULL DEFAULT 'Association Disciples Shaolin Si Sénégal',
    "contactEmail" VARCHAR(255),
    "contactPhone" VARCHAR(30),
    "website" VARCHAR(255),
    "notifyNewMember" BOOLEAN NOT NULL DEFAULT true,
    "notifyNewAffiliation" BOOLEAN NOT NULL DEFAULT true,
    "notifyCompetitions" BOOLEAN NOT NULL DEFAULT false,
    "notifyNewsletter" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

