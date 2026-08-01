-- Add preview_text column to email_templates for email preheader support
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS preview_text TEXT DEFAULT '';
