
-- Create folders table
CREATE TABLE public.contact_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create junction table for many-to-many
CREATE TABLE public.contact_folder_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.contact_folders(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(folder_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.contact_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_folder_members ENABLE ROW LEVEL SECURITY;

-- RLS for folders
CREATE POLICY "Users can manage own folders" ON public.contact_folders
  FOR ALL TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for folder members
CREATE POLICY "Users can manage own folder members" ON public.contact_folder_members
  FOR ALL TO public
  USING (EXISTS (
    SELECT 1 FROM public.contact_folders
    WHERE contact_folders.id = contact_folder_members.folder_id
    AND contact_folders.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contact_folders
    WHERE contact_folders.id = contact_folder_members.folder_id
    AND contact_folders.user_id = auth.uid()
  ));

-- Add updated_at trigger for folders
CREATE TRIGGER update_contact_folders_updated_at
  BEFORE UPDATE ON public.contact_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
