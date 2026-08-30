-- AlterTable
ALTER TABLE "affiliation_demandes" ADD COLUMN     "paymentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "paymentConfirmedById" INTEGER,
ADD COLUMN     "preuvePaiementUrl" VARCHAR(500),
ADD COLUMN     "referenceManuelle" VARCHAR(255);

-- AddForeignKey
ALTER TABLE "affiliation_demandes" ADD CONSTRAINT "affiliation_demandes_paymentConfirmedById_fkey" FOREIGN KEY ("paymentConfirmedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

