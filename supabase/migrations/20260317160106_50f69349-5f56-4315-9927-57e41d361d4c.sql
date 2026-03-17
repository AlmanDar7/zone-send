
-- Email events table for open/click tracking
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  email_queue_id UUID REFERENCES public.email_queue(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'open', 'click'
  link_url TEXT, -- for click events
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email events"
ON public.email_events FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service can insert events"
ON public.email_events FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_email_events_contact ON public.email_events(contact_id);
CREATE INDEX idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
CREATE INDEX idx_email_events_created ON public.email_events(created_at);

-- Add lead_score column to contacts
ALTER TABLE public.contacts ADD COLUMN lead_score INTEGER NOT NULL DEFAULT 0;

-- Add open_count and click_count to email_queue for quick lookups
ALTER TABLE public.email_queue ADD COLUMN open_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.email_queue ADD COLUMN click_count INTEGER NOT NULL DEFAULT 0;

-- Lead scoring function
CREATE OR REPLACE FUNCTION public.recalculate_lead_score(p_contact_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score INTEGER := 0;
  v_opens INTEGER;
  v_clicks INTEGER;
  v_replied BOOLEAN;
  v_last_event TIMESTAMP;
BEGIN
  SELECT COUNT(*) INTO v_opens FROM email_events WHERE contact_id = p_contact_id AND event_type = 'open';
  SELECT COUNT(*) INTO v_clicks FROM email_events WHERE contact_id = p_contact_id AND event_type = 'click';
  SELECT (status = 'Replied') INTO v_replied FROM contacts WHERE id = p_contact_id;
  SELECT MAX(created_at) INTO v_last_event FROM email_events WHERE contact_id = p_contact_id;

  -- Scoring: opens=1pt each(max 20), clicks=3pt each(max 30), reply=25pt, recency bonus up to 25pt
  v_score := LEAST(v_opens, 20) + LEAST(v_clicks * 3, 30);
  IF v_replied THEN v_score := v_score + 25; END IF;
  
  IF v_last_event IS NOT NULL THEN
    v_score := v_score + GREATEST(0, 25 - EXTRACT(DAY FROM (now() - v_last_event))::INTEGER);
  END IF;

  UPDATE contacts SET lead_score = LEAST(v_score, 100) WHERE id = p_contact_id;
END;
$$;

-- Trigger to auto-recalculate on new events
CREATE OR REPLACE FUNCTION public.trigger_recalculate_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM recalculate_lead_score(NEW.contact_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER recalc_lead_score_on_event
AFTER INSERT ON public.email_events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_lead_score();
