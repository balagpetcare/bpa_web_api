CREATE TYPE "HomepageStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "HomepageSectionType" AS ENUM ('hero', 'stats', 'mission', 'campaigns', 'news', 'events', 'vision', 'committee', 'cta', 'partners', 'custom');
CREATE TYPE "HomepageSectionSource" AS ENUM ('manual', 'automatic', 'static');
CREATE TYPE "HeroSlideStatus" AS ENUM ('draft', 'published', 'archived');
CREATE TYPE "HeroSlideMediaType" AS ENUM ('image', 'video');
CREATE TYPE "HeroSlideOverlayPosition" AS ENUM ('left', 'center', 'right');
CREATE TYPE "HomepageCtaType" AS ENUM ('none', 'internal', 'external');

CREATE TABLE "homepages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
  "title" VARCHAR(255),
  "description" TEXT,
  "status" "HomepageStatus" NOT NULL DEFAULT 'draft',
  "settings" JSONB,
  "published_at" TIMESTAMPTZ,
  "updated_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "homepages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "homepage_sections" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "homepage_id" UUID NOT NULL,
  "type" "HomepageSectionType" NOT NULL,
  "source" "HomepageSectionSource" NOT NULL DEFAULT 'static',
  "title" VARCHAR(255),
  "eyebrow" VARCHAR(120),
  "subtitle" TEXT,
  "body" TEXT,
  "cta_type" "HomepageCtaType" NOT NULL DEFAULT 'none',
  "cta_label" VARCHAR(80),
  "cta_href" TEXT,
  "cta_target" VARCHAR(20) NOT NULL DEFAULT '_self',
  "item_limit" INTEGER NOT NULL DEFAULT 3,
  "content" JSONB,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "start_at" TIMESTAMPTZ,
  "end_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "homepage_section_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "section_id" UUID NOT NULL,
  "entity_type" VARCHAR(60),
  "entity_id" UUID,
  "title" VARCHAR(255),
  "subtitle" TEXT,
  "body" TEXT,
  "href" TEXT,
  "media_id" UUID,
  "metadata" JSONB,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "homepage_section_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hero_slides" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
  "title" VARCHAR(120) NOT NULL,
  "badge_text" VARCHAR(40),
  "eyebrow" VARCHAR(80),
  "headline" VARCHAR(180) NOT NULL,
  "body" TEXT,
  "campaign_tag" VARCHAR(60),
  "status" "HeroSlideStatus" NOT NULL DEFAULT 'draft',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "media_type" "HeroSlideMediaType" NOT NULL DEFAULT 'image',
  "overlay_position" "HeroSlideOverlayPosition" NOT NULL DEFAULT 'left',
  "cta_type" "HomepageCtaType" NOT NULL DEFAULT 'none',
  "cta_label" VARCHAR(80),
  "cta_href" TEXT,
  "cta_target" VARCHAR(20) NOT NULL DEFAULT '_self',
  "secondary_cta_type" "HomepageCtaType" NOT NULL DEFAULT 'none',
  "secondary_cta_label" VARCHAR(80),
  "secondary_cta_href" TEXT,
  "secondary_cta_target" VARCHAR(20) NOT NULL DEFAULT '_self',
  "desktop_image_id" UUID NOT NULL,
  "mobile_image_id" UUID,
  "video_id" UUID,
  "stats" JSONB,
  "countdown_label" VARCHAR(80),
  "countdown_target_at" TIMESTAMPTZ,
  "start_at" TIMESTAMPTZ,
  "end_at" TIMESTAMPTZ,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "hero_slides_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "partners" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(160) NOT NULL,
  "description" TEXT,
  "logo_id" UUID,
  "url" TEXT,
  "tier" VARCHAR(80),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "start_at" TIMESTAMPTZ,
  "end_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "footer_configs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "locale" VARCHAR(10) NOT NULL DEFAULT 'en',
  "brand_name" VARCHAR(160),
  "brand_text" TEXT,
  "logo_id" UUID,
  "email" VARCHAR(255),
  "phone" VARCHAR(40),
  "address" TEXT,
  "copyright_text" TEXT,
  "social_links" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "footer_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "footer_link_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "footer_id" UUID NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "footer_link_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "footer_links" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "group_id" UUID NOT NULL,
  "label" VARCHAR(120) NOT NULL,
  "href" TEXT NOT NULL,
  "target" VARCHAR(20) NOT NULL DEFAULT '_self',
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_visible" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "footer_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "homepages_locale_key" ON "homepages"("locale");
CREATE INDEX "homepages_status_idx" ON "homepages"("status");
CREATE INDEX "homepage_sections_homepage_id_sort_order_idx" ON "homepage_sections"("homepage_id", "sort_order");
CREATE INDEX "homepage_sections_type_is_visible_idx" ON "homepage_sections"("type", "is_visible");
CREATE INDEX "homepage_section_items_section_id_sort_order_idx" ON "homepage_section_items"("section_id", "sort_order");
CREATE INDEX "homepage_section_items_entity_type_entity_id_idx" ON "homepage_section_items"("entity_type", "entity_id");
CREATE INDEX "hero_slides_locale_status_is_active_sort_order_idx" ON "hero_slides"("locale", "status", "is_active", "sort_order");
CREATE INDEX "partners_is_active_sort_order_idx" ON "partners"("is_active", "sort_order");
CREATE UNIQUE INDEX "footer_configs_locale_key" ON "footer_configs"("locale");
CREATE INDEX "footer_link_groups_footer_id_sort_order_idx" ON "footer_link_groups"("footer_id", "sort_order");
CREATE INDEX "footer_links_group_id_sort_order_idx" ON "footer_links"("group_id", "sort_order");

ALTER TABLE "homepages" ADD CONSTRAINT "homepages_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_homepage_id_fkey" FOREIGN KEY ("homepage_id") REFERENCES "homepages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homepage_section_items" ADD CONSTRAINT "homepage_section_items_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "homepage_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "homepage_section_items" ADD CONSTRAINT "homepage_section_items_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_desktop_image_id_fkey" FOREIGN KEY ("desktop_image_id") REFERENCES "media_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_mobile_image_id_fkey" FOREIGN KEY ("mobile_image_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partners" ADD CONSTRAINT "partners_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "footer_configs" ADD CONSTRAINT "footer_configs_logo_id_fkey" FOREIGN KEY ("logo_id") REFERENCES "media_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "footer_link_groups" ADD CONSTRAINT "footer_link_groups_footer_id_fkey" FOREIGN KEY ("footer_id") REFERENCES "footer_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "footer_links" ADD CONSTRAINT "footer_links_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "footer_link_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
