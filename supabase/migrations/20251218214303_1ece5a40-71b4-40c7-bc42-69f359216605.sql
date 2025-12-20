-- Create email_logs table to track sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  opened_at TIMESTAMP WITH TIME ZONE,
  tracking_id UUID NOT NULL DEFAULT gen_random_uuid(),
  is_test BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can manage email logs
CREATE POLICY "Admins can manage email logs"
ON public.email_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to insert (for edge function)
CREATE POLICY "Service role can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (true);

-- Allow public read for tracking pixel
CREATE POLICY "Public can update for tracking"
ON public.email_logs
FOR UPDATE
USING (true)
WITH CHECK (true);