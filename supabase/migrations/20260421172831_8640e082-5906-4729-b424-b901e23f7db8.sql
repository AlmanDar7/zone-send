
-- Add blocks column to email_templates for the new block-based builder
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS blocks jsonb;

-- Brand themes
CREATE TABLE IF NOT EXISTS public.brand_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  brand_name text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#111827',
  background_color text NOT NULL DEFAULT '#ffffff',
  heading_font text NOT NULL DEFAULT 'Georgia, "Times New Roman", serif',
  body_font text NOT NULL DEFAULT 'Arial, sans-serif',
  button_style jsonb NOT NULL DEFAULT '{"radius":999,"textColor":"#ffffff","background":"#111827"}'::jsonb,
  footer_style jsonb NOT NULL DEFAULT '{"text":"","color":"#6b7280","alignment":"center"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brand_themes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own brand themes" ON public.brand_themes;
CREATE POLICY "Users can manage own brand themes"
  ON public.brand_themes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_brand_themes_updated_at ON public.brand_themes;
CREATE TRIGGER update_brand_themes_updated_at
  BEFORE UPDATE ON public.brand_themes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reusable template sections / snippets
CREATE TABLE IF NOT EXISTS public.template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'custom',
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.template_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own template sections" ON public.template_sections;
CREATE POLICY "Users can manage own template sections"
  ON public.template_sections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_template_sections_updated_at ON public.template_sections;
CREATE TRIGGER update_template_sections_updated_at
  BEFORE UPDATE ON public.template_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public storage bucket for template images
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-images', 'template-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, authenticated users can manage their own folder
DROP POLICY IF EXISTS "Template images are publicly readable" ON storage.objects;
CREATE POLICY "Template images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-images');

DROP POLICY IF EXISTS "Users can upload template images to own folder" ON storage.objects;
CREATE POLICY "Users can upload template images to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own template images" ON storage.objects;
CREATE POLICY "Users can update own template images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'template-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own template images" ON storage.objects;
CREATE POLICY "Users can delete own template images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'template-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
