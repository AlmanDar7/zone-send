export interface ContentRow {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  type?: string;
  template_format?: string;
  html_body?: string | null;
  design_config?: any;
  blocks?: any;
  category?: string;
  tags?: any;
  created_at?: string;
  updated_at?: string;
  thumbnail_url?: string | null;
}

export const FORM_CATEGORY = "form";

export const isFormContent = (item: ContentRow) => item.category === FORM_CATEGORY;

export const isEmailContent = (item: ContentRow) => item.category !== FORM_CATEGORY;
