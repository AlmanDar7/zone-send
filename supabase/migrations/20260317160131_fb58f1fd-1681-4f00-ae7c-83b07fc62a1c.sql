
-- Fix: Replace permissive INSERT policy with service_role only
DROP POLICY "Service can insert events" ON public.email_events;

CREATE POLICY "Service role can insert events"
ON public.email_events FOR INSERT
TO service_role
WITH CHECK (true);
