-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MEMBER', 'CLUB_MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('WAVE', 'ORANGE_MONEY', 'CARD', 'CASH');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AffiliationType" AS ENUM ('CLUB', 'MAITRE', 'MEMBRE');

-- CreateEnum
CREATE TYPE "AffiliationStatus" AS ENUM ('PENDING_PAYMENT', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "password" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "passwordResetToken" VARCHAR(255),
    "passwordResetExpires" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" SERIAL NOT NULL,
    "token" VARCHAR(512) NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" SERIAL NOT NULL,
    "nom" VARCHAR(150) NOT NULL,
    "code" VARCHAR(20),
    "regionId" INTEGER NOT NULL,
    "ville" VARCHAR(100),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "nomMaitre" VARCHAR(100),
    "telephone" VARCHAR(20),
    "email" VARCHAR(255),
    "description" TEXT,
    "logoUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "clubId" INTEGER NOT NULL,
    "prenom" VARCHAR(100) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "sexe" "Sexe",
    "grade" VARCHAR(50),
    "discipline" VARCHAR(100),
    "photoUrl" VARCHAR(500),
    "adresse" VARCHAR(255),
    "nationalite" VARCHAR(100),
    "groupeSanguin" VARCHAR(10),
    "contactUrgenceNom" VARCHAR(150),
    "contactUrgencePhone" VARCHAR(20),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "uuid" VARCHAR(36) NOT NULL,
    "qrToken" VARCHAR(512) NOT NULL,
    "status" "LicenseStatus" NOT NULL DEFAULT 'PENDING',
    "dateDebut" TIMESTAMP(3),
    "dateFin" TIMESTAMP(3),
    "pdfUrl" VARCHAR(500),
    "annee" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "licenseId" INTEGER NOT NULL,
    "montant" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(5) NOT NULL DEFAULT 'XOF',
    "provider" "PaymentProvider" NOT NULL,
    "transactionRef" VARCHAR(255),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "regionId" INTEGER NOT NULL,
    "lieu" VARCHAR(200),
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "categories" JSONB,
    "imageUrl" VARCHAR(500),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscriptions" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "categorie" VARCHAR(100),
    "statut" VARCHAR(50) NOT NULL DEFAULT 'inscrit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultats" (
    "id" SERIAL NOT NULL,
    "competitionId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "categorie" VARCHAR(100),
    "classement" INTEGER,
    "points" DOUBLE PRECISION,
    "medaille" VARCHAR(20),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resultats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actualites" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "contenu" TEXT NOT NULL,
    "imageUrl" VARCHAR(500),
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actualites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "subject" VARCHAR(100) NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliation_demandes" (
    "id" SERIAL NOT NULL,
    "type" "AffiliationType" NOT NULL,
    "status" "AffiliationStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "code" VARCHAR(20),
    "prenom" VARCHAR(100) NOT NULL,
    "nom" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "telephone" VARCHAR(20) NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "sexe" "Sexe",
    "adresse" VARCHAR(255),
    "ville" VARCHAR(100),
    "regionId" INTEGER,
    "nationalite" VARCHAR(100),
    "photoUrl" VARCHAR(500),
    "clubId" INTEGER,
    "donneesSpecifiques" JSONB,
    "montant" INTEGER NOT NULL DEFAULT 0,
    "paymentProvider" "PaymentProvider",
    "waveCheckoutId" VARCHAR(100),
    "waveCheckoutUrl" VARCHAR(500),
    "omOrderId" VARCHAR(200),
    "omPayToken" VARCHAR(500),
    "paidAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "motifRejet" TEXT,
    "approvedById" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliation_demandes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_code_key" ON "regions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_passwordResetToken_key" ON "users"("passwordResetToken");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "clubs_code_key" ON "clubs"("code");

-- CreateIndex
CREATE INDEX "clubs_regionId_idx" ON "clubs"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");

-- CreateIndex
CREATE INDEX "members_clubId_idx" ON "members"("clubId");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_uuid_key" ON "licenses"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_qrToken_key" ON "licenses"("qrToken");

-- CreateIndex
CREATE INDEX "licenses_memberId_idx" ON "licenses"("memberId");

-- CreateIndex
CREATE INDEX "licenses_status_dateFin_idx" ON "licenses"("status", "dateFin");

-- CreateIndex
CREATE INDEX "payments_licenseId_idx" ON "payments"("licenseId");

-- CreateIndex
CREATE INDEX "competitions_regionId_idx" ON "competitions"("regionId");

-- CreateIndex
CREATE INDEX "competitions_dateDebut_idx" ON "competitions"("dateDebut");

-- CreateIndex
CREATE INDEX "inscriptions_competitionId_idx" ON "inscriptions"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "inscriptions_memberId_competitionId_key" ON "inscriptions"("memberId", "competitionId");

-- CreateIndex
CREATE INDEX "resultats_competitionId_idx" ON "resultats"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "actualites_slug_key" ON "actualites"("slug");

-- CreateIndex
CREATE INDEX "actualites_slug_idx" ON "actualites"("slug");

-- CreateIndex
CREATE INDEX "actualites_isPublished_publishedAt_idx" ON "actualites"("isPublished", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "affiliation_demandes_code_key" ON "affiliation_demandes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "affiliation_demandes_waveCheckoutId_key" ON "affiliation_demandes"("waveCheckoutId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliation_demandes_omOrderId_key" ON "affiliation_demandes"("omOrderId");

-- CreateIndex
CREATE INDEX "affiliation_demandes_type_status_idx" ON "affiliation_demandes"("type", "status");

-- CreateIndex
CREATE INDEX "affiliation_demandes_email_idx" ON "affiliation_demandes"("email");

-- CreateIndex
CREATE INDEX "affiliation_demandes_waveCheckoutId_idx" ON "affiliation_demandes"("waveCheckoutId");

-- CreateIndex
CREATE INDEX "affiliation_demandes_omOrderId_idx" ON "affiliation_demandes"("omOrderId");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_licenseId_fkey" FOREIGN KEY ("licenseId") REFERENCES "licenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscriptions" ADD CONSTRAINT "inscriptions_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultats" ADD CONSTRAINT "resultats_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliation_demandes" ADD CONSTRAINT "affiliation_demandes_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliation_demandes" ADD CONSTRAINT "affiliation_demandes_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "clubs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliation_demandes" ADD CONSTRAINT "affiliation_demandes_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

