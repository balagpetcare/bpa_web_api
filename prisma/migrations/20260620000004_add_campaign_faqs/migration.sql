-- Create CampaignFaq table
CREATE TABLE IF NOT EXISTS campaign_faqs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL,
    question_en TEXT NOT NULL,
    question_bn TEXT,
    answer_en TEXT NOT NULL,
    answer_bn TEXT,
    category VARCHAR(100),
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by_id UUID,
    updated_by_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT campaign_faqs_pkey PRIMARY KEY (id),
    CONSTRAINT campaign_faqs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    CONSTRAINT campaign_faqs_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES users(id),
    CONSTRAINT campaign_faqs_updated_by_id_fkey FOREIGN KEY (updated_by_id) REFERENCES users(id)
);

-- Index for efficient querying by campaign and sorting
CREATE INDEX IF NOT EXISTS campaign_faqs_campaign_id_sort_order_idx ON campaign_faqs(campaign_id, sort_order);
