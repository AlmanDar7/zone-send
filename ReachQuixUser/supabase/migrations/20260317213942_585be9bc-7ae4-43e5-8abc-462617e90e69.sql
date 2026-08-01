-- A/B Testing: Add variant columns to campaign_steps
ALTER TABLE public.campaign_steps ADD COLUMN IF NOT EXISTS subject_a text;
ALTER TABLE public.campaign_steps ADD COLUMN IF NOT EXISTS subject_b text;
ALTER TABLE public.campaign_steps ADD COLUMN IF NOT EXISTS body_a text;
ALTER TABLE public.campaign_steps ADD COLUMN IF NOT EXISTS body_b text;
ALTER TABLE public.campaign_steps ADD COLUMN IF NOT EXISTS winning_variant text DEFAULT null;
ALTER TABLE public.campaign_steps ADD COLUMN IF NOT EXISTS ab_test_enabled boolean DEFAULT false;

-- Track which variant was sent to each contact
ALTER TABLE public.email_queue ADD COLUMN IF NOT EXISTS variant text DEFAULT null;

-- Timezone scheduling: Add timezone to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Webhooks table for Zapier/external integrations
CREATE TABLE IF NOT EXISTS public.webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own webhooks"
  ON public.webhooks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Webhook delivery log
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  status_code integer,
  response_body text,
  success boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.webhooks w WHERE w.id = webhook_deliveries.webhook_id AND w.user_id = auth.uid()
  ));

-- Trigger to update updated_at on webhooks
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();