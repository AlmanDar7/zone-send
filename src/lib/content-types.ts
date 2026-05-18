import type { Database } from "@/integrations/supabase/types";

export type ContentRow = Database["public"]["Tables"]["email_templates"]["Row"];

export const FORM_CATEGORY = "form";

export const isFormContent = (item: ContentRow) => item.category === FORM_CATEGORY;

export const isEmailContent = (item: ContentRow) => item.category !== FORM_CATEGORY;
