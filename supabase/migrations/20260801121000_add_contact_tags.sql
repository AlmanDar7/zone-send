-- Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT 'bg-primary/10 text-primary',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, name)
);

-- Create contact_tags junction table
CREATE TABLE IF NOT EXISTS public.contact_tags (
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (contact_id, tag_id)
);

-- Set up RLS for tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
  ON public.tags FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- Set up RLS for contact_tags
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- Users can view contact_tags if they own the associated contact
CREATE POLICY "Users can view contact_tags for their contacts"
  ON public.contact_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert contact_tags for their contacts"
  ON public.contact_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete contact_tags for their contacts"
  ON public.contact_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.contacts
      WHERE contacts.id = contact_tags.contact_id
      AND contacts.user_id = auth.uid()
    )
  );
