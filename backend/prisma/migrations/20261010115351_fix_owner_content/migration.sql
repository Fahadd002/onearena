/*
  Warnings:

  - You are about to drop the column `mapEmbedUrl` on the `owner_contact_section` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundImage` on the `owner_hero_section` table. All the data in the column will be lost.
  - You are about to drop the column `ctaHref` on the `owner_hero_section` table. All the data in the column will be lost.
  - You are about to drop the column `ctaLabel` on the `owner_hero_section` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "owner_contact_section" DROP COLUMN "mapEmbedUrl";

-- AlterTable
ALTER TABLE "owner_hero_section" DROP COLUMN "backgroundImage",
DROP COLUMN "ctaHref",
DROP COLUMN "ctaLabel",
ADD COLUMN     "coverImage" TEXT;
