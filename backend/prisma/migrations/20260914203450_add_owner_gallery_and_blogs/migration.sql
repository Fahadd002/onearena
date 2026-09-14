-- DropEnum
DROP TYPE "CommissionStatus";

-- CreateTable
CREATE TABLE "owner_gallery_item" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_gallery_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_blog" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_blog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "owner_gallery_item_ownerId_active_sortOrder_idx" ON "owner_gallery_item"("ownerId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "owner_blog_ownerId_published_publishedAt_idx" ON "owner_blog"("ownerId", "published", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "owner_blog_ownerId_slug_key" ON "owner_blog"("ownerId", "slug");

-- AddForeignKey
ALTER TABLE "owner_gallery_item" ADD CONSTRAINT "owner_gallery_item_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_blog" ADD CONSTRAINT "owner_blog_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
