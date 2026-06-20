-- CreateTable
CREATE TABLE "mail_internal_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "thread_id" UUID NOT NULL,
    "message_id" UUID,
    "note" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mail_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mail_internal_notes_thread_id_idx" ON "mail_internal_notes"("thread_id");

-- CreateIndex
CREATE INDEX "mail_internal_notes_message_id_idx" ON "mail_internal_notes"("message_id");

-- CreateIndex
CREATE INDEX "mail_internal_notes_created_by_id_idx" ON "mail_internal_notes"("created_by_id");

-- AddForeignKey
ALTER TABLE "mail_internal_notes" ADD CONSTRAINT "mail_internal_notes_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "mail_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_internal_notes" ADD CONSTRAINT "mail_internal_notes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "mail_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mail_internal_notes" ADD CONSTRAINT "mail_internal_notes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
