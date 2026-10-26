/*
  Warnings:

  - You are about to drop the column `ownerId` on the `announcement` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `owner_blog` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `owner_gallery_item` table. All the data in the column will be lost.
  - You are about to drop the column `ownerId` on the `owner_social_link` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[ownerProfileId,slug]` on the table `owner_blog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ownerProfileId` to the `announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerProfileId` to the `owner_blog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerProfileId` to the `owner_gallery_item` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerProfileId` to the `owner_social_link` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "announcement" DROP CONSTRAINT "announcement_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "owner_blog" DROP CONSTRAINT "owner_blog_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "owner_gallery_item" DROP CONSTRAINT "owner_gallery_item_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "owner_social_link" DROP CONSTRAINT "owner_social_link_ownerId_fkey";

-- DropIndex
DROP INDEX "announcement_ownerId_isActive_idx";

-- DropIndex
DROP INDEX "owner_blog_ownerId_published_publishedAt_idx";

-- DropIndex
DROP INDEX "owner_blog_ownerId_slug_key";

-- DropIndex
DROP INDEX "owner_gallery_item_ownerId_active_sortOrder_idx";

-- DropIndex
DROP INDEX "owner_social_link_ownerId_isActive_sortOrder_idx";

-- AlterTable
ALTER TABLE "announcement" DROP COLUMN "ownerId",
ADD COLUMN     "ownerProfileId" TEXT NOT NULL,
ADD COLUMN     "pinned" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "owner_blog" DROP COLUMN "ownerId",
ADD COLUMN     "ownerProfileId" TEXT NOT NULL,
ADD COLUMN     "readMinutes" INTEGER;

-- AlterTable
ALTER TABLE "owner_gallery_item" DROP COLUMN "ownerId",
ADD COLUMN     "ownerProfileId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "owner_social_link" DROP COLUMN "ownerId",
ADD COLUMN     "ownerProfileId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "owner_hero_section" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "subheadline" TEXT,
    "ctaLabel" TEXT DEFAULT 'Book Now',
    "ctaHref" TEXT,
    "backgroundImage" TEXT,
    "overlayOpacity" INTEGER NOT NULL DEFAULT 40,
    "textAlign" TEXT NOT NULL DEFAULT 'CENTER',
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_hero_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_about_section" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "heading" TEXT NOT NULL DEFAULT 'About Us',
    "body" TEXT NOT NULL,
    "highlights" JSONB,
    "imageUrl" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_about_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_contact_section" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "heading" TEXT NOT NULL DEFAULT 'Contact Us',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "mapEmbedUrl" TEXT,
    "openingHours" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_contact_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_faq_item" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_faq_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "owner_hero_section_ownerProfileId_key" ON "owner_hero_section"("ownerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "owner_about_section_ownerProfileId_key" ON "owner_about_section"("ownerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "owner_contact_section_ownerProfileId_key" ON "owner_contact_section"("ownerProfileId");

-- CreateIndex
CREATE INDEX "owner_faq_item_ownerProfileId_isActive_sortOrder_idx" ON "owner_faq_item"("ownerProfileId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "announcement_ownerProfileId_isActive_idx" ON "announcement"("ownerProfileId", "isActive");

-- CreateIndex
CREATE INDEX "owner_blog_ownerProfileId_published_publishedAt_idx" ON "owner_blog"("ownerProfileId", "published", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "owner_blog_ownerProfileId_slug_key" ON "owner_blog"("ownerProfileId", "slug");

-- CreateIndex
CREATE INDEX "owner_gallery_item_ownerProfileId_active_sortOrder_idx" ON "owner_gallery_item"("ownerProfileId", "active", "sortOrder");

-- CreateIndex
CREATE INDEX "owner_social_link_ownerProfileId_isActive_sortOrder_idx" ON "owner_social_link"("ownerProfileId", "isActive", "sortOrder");

-- AddForeignKey
ALTER TABLE "owner_gallery_item" ADD CONSTRAINT "owner_gallery_item_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_blog" ADD CONSTRAINT "owner_blog_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_social_link" ADD CONSTRAINT "owner_social_link_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_hero_section" ADD CONSTRAINT "owner_hero_section_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_about_section" ADD CONSTRAINT "owner_about_section_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_contact_section" ADD CONSTRAINT "owner_contact_section_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner_faq_item" ADD CONSTRAINT "owner_faq_item_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "owner_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
