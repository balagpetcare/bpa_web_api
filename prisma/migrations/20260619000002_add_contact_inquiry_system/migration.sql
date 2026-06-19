-- CreateEnum
CREATE TYPE "inquiry_priority" AS ENUM ('normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "inquiry_status" AS ENUM ('new', 'read', 'pending', 'in_progress', 'waiting_response', 'resolved', 'closed', 'spam');

-- CreateTable
CREATE TABLE "contact_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(60) NOT NULL,
    "label_en" VARCHAR(120) NOT NULL,
    "label_bn" VARCHAR(120),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiry_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(60) NOT NULL,
    "label_en" VARCHAR(120) NOT NULL,
    "label_bn" VARCHAR(120),
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inquiry_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_departments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(60) NOT NULL,
    "name_en" VARCHAR(120) NOT NULL,
    "name_bn" VARCHAR(120),
    "description" TEXT,
    "contact_email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_priority_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "contact_type_slug" VARCHAR(60),
    "category_slug" VARCHAR(60),
    "priority" "inquiry_priority" NOT NULL,
    "department_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_priority_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_inquiries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_number" VARCHAR(30) NOT NULL,
    "contact_type_id" UUID,
    "category_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "whatsapp" VARCHAR(30),
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "organization_name" VARCHAR(255),
    "designation" VARCHAR(120),
    "website" VARCHAR(500),
    "subject" VARCHAR(500) NOT NULL,
    "message" TEXT NOT NULL,
    "attachment_url" TEXT,
    "priority" "inquiry_priority" NOT NULL DEFAULT 'normal',
    "status" "inquiry_status" NOT NULL DEFAULT 'new',
    "department_id" UUID,
    "assigned_to_id" UUID,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "source" VARCHAR(100) DEFAULT 'web',
    "read_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inquiry_id" UUID NOT NULL,
    "mail_account_id" UUID,
    "to_addresses" TEXT[],
    "cc_addresses" TEXT[],
    "subject" VARCHAR(500) NOT NULL,
    "body_html" TEXT NOT NULL,
    "plain_text" TEXT,
    "sent_by_id" UUID NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_forwards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inquiry_id" UUID NOT NULL,
    "to_addresses" TEXT[],
    "cc_addresses" TEXT[],
    "subject" VARCHAR(500) NOT NULL,
    "body_html" TEXT NOT NULL,
    "note" TEXT,
    "forwarded_by_id" UUID NOT NULL,
    "forwarded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_forwards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_internal_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inquiry_id" UUID NOT NULL,
    "note" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "contact_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_types_slug_key" ON "contact_types"("slug");
CREATE UNIQUE INDEX "inquiry_categories_slug_key" ON "inquiry_categories"("slug");
CREATE UNIQUE INDEX "contact_departments_slug_key" ON "contact_departments"("slug");
CREATE UNIQUE INDEX "contact_inquiries_ticket_number_key" ON "contact_inquiries"("ticket_number");
CREATE INDEX "contact_inquiries_status_idx" ON "contact_inquiries"("status");
CREATE INDEX "contact_inquiries_priority_idx" ON "contact_inquiries"("priority");
CREATE INDEX "contact_inquiries_email_idx" ON "contact_inquiries"("email");
CREATE INDEX "contact_inquiries_created_at_idx" ON "contact_inquiries"("created_at");

-- AddForeignKey
ALTER TABLE "contact_priority_rules" ADD CONSTRAINT "contact_priority_rules_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "contact_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_contact_type_id_fkey" FOREIGN KEY ("contact_type_id") REFERENCES "contact_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "inquiry_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "contact_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contact_replies" ADD CONSTRAINT "contact_replies_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "contact_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_replies" ADD CONSTRAINT "contact_replies_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contact_forwards" ADD CONSTRAINT "contact_forwards_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "contact_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_forwards" ADD CONSTRAINT "contact_forwards_forwarded_by_id_fkey" FOREIGN KEY ("forwarded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contact_internal_notes" ADD CONSTRAINT "contact_internal_notes_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "contact_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "contact_internal_notes" ADD CONSTRAINT "contact_internal_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
