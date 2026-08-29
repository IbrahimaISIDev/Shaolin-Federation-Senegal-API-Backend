-- CreateTable
CREATE TABLE "media_items" (
    "id" SERIAL NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "publicId" VARCHAR(255) NOT NULL,
    "title" VARCHAR(150),
    "mimeType" VARCHAR(50),
    "size" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_items_createdAt_idx" ON "media_items"("createdAt");

-- AddForeignKey
ALTER TABLE "media_items" ADD CONSTRAINT "media_items_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
