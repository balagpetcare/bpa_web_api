-- Add new enum types
CREATE TYPE "StaffDutyRole" AS ENUM ('QR_SCAN', 'CHECK_IN', 'VACCINATION_DESK', 'CERTIFICATE_DESK', 'SESSION_MANAGER', 'GENERAL_VOLUNTEER');
CREATE TYPE "DoctorDutyRole" AS ENUM ('SIGNING_DOCTOR', 'MEDICAL_SUPERVISOR', 'VACCINATOR', 'EMERGENCY_SUPPORT');
CREATE TYPE "ContentPostType" AS ENUM ('VIDEO', 'COMMUNITY_POST', 'ANNOUNCEMENT', 'DONATION_STORY', 'CAMPAIGN_UPDATE', 'PET_CARE_TIP');
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'normal', 'high', 'critical');
CREATE TYPE "NotificationStatus" AS ENUM ('unread', 'read', 'dismissed');
CREATE TYPE "NotificationType" AS ENUM ('contact_inquiry', 'membership_purchase', 'membership_payment_pending', 'membership_payment_completed', 'membership_payment_failed', 'donation_new', 'donation_payment_pending', 'donation_payment_completed', 'campaign_registration_new', 'campaign_registration_payment_pending');

-- Create campaign_staff_assignments table
CREATE TABLE "campaign_staff_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "campaign_id" uuid NOT NULL,
    "session_id" uuid,
    "user_id" uuid NOT NULL,
    "duty_role" "StaffDutyRole" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "assigned_by" uuid,
    "notes" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "campaign_staff_assignments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "campaign_staff_assignments_campaign_id_idx" ON "campaign_staff_assignments"("campaign_id");
CREATE INDEX IF NOT EXISTS "campaign_staff_assignments_session_id_idx" ON "campaign_staff_assignments"("session_id");
CREATE INDEX IF NOT EXISTS "campaign_staff_assignments_user_id_idx" ON "campaign_staff_assignments"("user_id");
ALTER TABLE "campaign_staff_assignments" ADD CONSTRAINT "campaign_staff_assignments_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE;
ALTER TABLE "campaign_staff_assignments" ADD CONSTRAINT "campaign_staff_assignments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "campaign_sessions"("id") ON DELETE SET NULL;
ALTER TABLE "campaign_staff_assignments" ADD CONSTRAINT "campaign_staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "campaign_staff_assignments" ADD CONSTRAINT "campaign_staff_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL;

-- Create campaign_doctor_assignments (already exists as campaign_doctors table, but ensure it has all fields)
-- Check if campaign_doctors table has the updated columns needed
-- The doctor assignments live in the existing campaign_doctors table with role column

-- Create content_categories table
CREATE TABLE "content_categories" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "name_en" varchar(100) NOT NULL,
    "name_bn" varchar(100) NOT NULL,
    "slug" varchar(100) NOT NULL,
    "description" text,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "content_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "content_categories_slug_key" ON "content_categories"("slug");

-- Create content_posts table
CREATE TABLE "content_posts" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "type" "ContentPostType" NOT NULL,
    "title_en" varchar(255) NOT NULL,
    "title_bn" varchar(255) NOT NULL,
    "slug" varchar(255) NOT NULL,
    "summary_en" text,
    "summary_bn" text,
    "body_en" text,
    "body_bn" text,
    "cover_image_url" text,
    "thumbnail_url" text,
    "video_url" text,
    "video_provider" varchar(50),
    "video_source_type" varchar(20) DEFAULT 'youtube' NOT NULL,
    "video_file_url" text,
    "video_file_key" text,
    "video_poster_url" text,
    "status" varchar(20) DEFAULT 'draft' NOT NULL,
    "category_id" uuid,
    "tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
    "allow_comments" boolean DEFAULT true NOT NULL,
    "show_on_homepage" boolean DEFAULT false NOT NULL,
    "is_featured" boolean DEFAULT false NOT NULL,
    "is_pinned" boolean DEFAULT false NOT NULL,
    "homepage_priority" integer DEFAULT 0 NOT NULL,
    "cta_label_en" varchar(100),
    "cta_label_bn" varchar(100),
    "cta_url" text,
    "cta_type" varchar(50),
    "view_count" integer DEFAULT 0 NOT NULL,
    "published_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "content_posts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "content_posts_slug_key" ON "content_posts"("slug");
CREATE INDEX IF NOT EXISTS "content_posts_type_idx" ON "content_posts"("type");
CREATE INDEX IF NOT EXISTS "content_posts_status_idx" ON "content_posts"("status");
CREATE INDEX IF NOT EXISTS "content_posts_category_id_idx" ON "content_posts"("category_id");
CREATE INDEX IF NOT EXISTS "content_posts_published_at_idx" ON "content_posts"("published_at");
CREATE INDEX IF NOT EXISTS "content_posts_show_on_homepage_idx" ON "content_posts"("show_on_homepage");
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "content_categories"("id") ON DELETE SET NULL;

-- Create content_comments table
CREATE TABLE "content_comments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "post_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "body" text NOT NULL,
    "status" varchar(20) DEFAULT 'approved' NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "content_comments_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "content_comments_post_id_idx" ON "content_comments"("post_id");
CREATE INDEX IF NOT EXISTS "content_comments_user_id_idx" ON "content_comments"("user_id");
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "content_posts"("id") ON DELETE CASCADE;
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Create content_reactions table
CREATE TABLE "content_reactions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "post_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "type" varchar(20) DEFAULT 'like' NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "content_reactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "content_reactions_post_id_user_id_key" ON "content_reactions"("post_id", "user_id");
CREATE INDEX IF NOT EXISTS "content_reactions_post_id_idx" ON "content_reactions"("post_id");
CREATE INDEX IF NOT EXISTS "content_reactions_user_id_idx" ON "content_reactions"("user_id");
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "content_posts"("id") ON DELETE CASCADE;
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Create content_reports table
CREATE TABLE "content_reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "post_id" uuid,
    "comment_id" uuid,
    "reported_by_id" uuid NOT NULL,
    "reason" text NOT NULL,
    "status" varchar(20) DEFAULT 'pending' NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "content_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "content_reports_post_id_idx" ON "content_reports"("post_id");
CREATE INDEX IF NOT EXISTS "content_reports_comment_id_idx" ON "content_reports"("comment_id");
CREATE INDEX IF NOT EXISTS "content_reports_status_idx" ON "content_reports"("status");
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "content_posts"("id") ON DELETE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "content_comments"("id") ON DELETE CASCADE;
ALTER TABLE "content_reports" ADD CONSTRAINT "content_reports_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- Create admin_notifications table
CREATE TABLE "admin_notifications" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" varchar(255) NOT NULL,
    "message" text NOT NULL,
    "module" varchar(60),
    "entity_type" varchar(60),
    "entity_id" varchar(255),
    "priority" "NotificationPriority" DEFAULT 'normal' NOT NULL,
    "status" "NotificationStatus" DEFAULT 'unread' NOT NULL,
    "action_url" varchar(500),
    "metadata" jsonb,
    "dedupe_key" varchar(255),
    "created_for_role" varchar(60),
    "created_for_user_id" uuid,
    "read_at" timestamptz,
    "dismissed_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz NOT NULL,
    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "admin_notifications_dedupe_key_key" ON "admin_notifications"("dedupe_key");
CREATE INDEX IF NOT EXISTS "admin_notifications_status_created_at_idx" ON "admin_notifications"("status", "created_at");
CREATE INDEX IF NOT EXISTS "admin_notifications_type_status_idx" ON "admin_notifications"("type", "status");
CREATE INDEX IF NOT EXISTS "admin_notifications_priority_status_idx" ON "admin_notifications"("priority", "status");
CREATE INDEX IF NOT EXISTS "admin_notifications_created_for_role_idx" ON "admin_notifications"("created_for_role");
CREATE INDEX IF NOT EXISTS "admin_notifications_created_for_user_id_idx" ON "admin_notifications"("created_for_user_id");

-- Create activity_events table
CREATE TABLE "activity_events" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "type" varchar(100) NOT NULL,
    "module" varchar(100) NOT NULL,
    "action" varchar(100) NOT NULL,
    "user_id" uuid,
    "session_id" varchar(100),
    "visitor_id" varchar(100),
    "entity_type" varchar(100),
    "entity_id" varchar(100),
    "title" varchar(255) NOT NULL,
    "metadata" jsonb,
    "ip_address" varchar(45),
    "user_agent" text,
    "path" text,
    "referrer" text,
    "device" varchar(50),
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "activity_events_type_idx" ON "activity_events"("type");
CREATE INDEX IF NOT EXISTS "activity_events_module_idx" ON "activity_events"("module");
CREATE INDEX IF NOT EXISTS "activity_events_action_idx" ON "activity_events"("action");
CREATE INDEX IF NOT EXISTS "activity_events_user_id_idx" ON "activity_events"("user_id");
CREATE INDEX IF NOT EXISTS "activity_events_visitor_id_idx" ON "activity_events"("visitor_id");
CREATE INDEX IF NOT EXISTS "activity_events_created_at_idx" ON "activity_events"("created_at");
CREATE INDEX IF NOT EXISTS "activity_events_entity_type_entity_id_idx" ON "activity_events"("entity_type", "entity_id");
