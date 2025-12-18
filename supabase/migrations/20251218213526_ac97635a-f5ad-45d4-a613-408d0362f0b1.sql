-- Create email templates table
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key text NOT NULL UNIQUE,
  subject_template text NOT NULL,
  header_text text NOT NULL DEFAULT 'وصلني - Waslni',
  primary_color text NOT NULL DEFAULT '#3b82f6',
  secondary_color text NOT NULL DEFAULT '#1d4ed8',
  footer_text text NOT NULL DEFAULT 'شكراً لاستخدامك وصلني',
  footer_text_en text NOT NULL DEFAULT 'Thank you for using Waslni',
  custom_message_pending text,
  custom_message_confirmed text,
  custom_message_preparing text,
  custom_message_ready text,
  custom_message_out_for_delivery text,
  custom_message_delivered text,
  custom_message_cancelled text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage email templates" 
ON public.email_templates 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions can read templates (for sending emails)
CREATE POLICY "Email templates readable by service role" 
ON public.email_templates 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.email_templates (template_key, subject_template, header_text, footer_text, footer_text_en)
VALUES ('order_status', 'تحديث طلبك #{order_id} - {status}', 'وصلني - Waslni', 'شكراً لاستخدامك وصلني', 'Thank you for using Waslni');