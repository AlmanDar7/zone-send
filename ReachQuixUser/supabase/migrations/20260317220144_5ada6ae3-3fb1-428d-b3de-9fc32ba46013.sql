-- Re-create the lead score trigger (it was lost)
CREATE OR REPLACE TRIGGER recalc_lead_score_on_event
AFTER INSERT ON public.email_events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_lead_score();

-- Enable pg_cron and pg_net for scheduled email processing
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;