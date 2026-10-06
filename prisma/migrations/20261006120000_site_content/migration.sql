-- Contenus éditoriaux modifiables depuis l'admin (accueil, bureau…)
CREATE TABLE "site_contents" (
    "key" VARCHAR(50) NOT NULL,
    "data" JSONB NOT NULL,
    "updatedById" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_contents_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "site_contents" ADD CONSTRAINT "site_contents_updatedById_fkey"
    FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
