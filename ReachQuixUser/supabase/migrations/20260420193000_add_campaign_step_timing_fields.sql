ALTER TABLE public.campaign_steps
ADD COLUMN IF NOT EXISTS delay_value INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS delay_unit TEXT NOT NULL DEFAULT 'days';

UPDATE public.campaign_steps
SET
  delay_value = COALESCE(delay_days, 0),
  delay_unit = 'days'
WHERE delay_value = 0 AND delay_unit = 'days';
