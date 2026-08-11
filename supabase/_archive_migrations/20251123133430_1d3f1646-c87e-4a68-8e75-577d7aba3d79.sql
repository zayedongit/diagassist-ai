-- Create user_login_events table to track all login activity
CREATE TABLE public.user_login_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  login_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_new_user BOOLEAN NOT NULL DEFAULT FALSE,
  phone_number TEXT NOT NULL,
  device_info TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add voice_agent_used column to pdf_analyses table
ALTER TABLE public.pdf_analyses 
ADD COLUMN voice_agent_used BOOLEAN DEFAULT FALSE;

-- Enable RLS on user_login_events
ALTER TABLE public.user_login_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all login events
CREATE POLICY "Admins can view all login events"
ON public.user_login_events
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage login events
CREATE POLICY "Service role can manage login events"
ON public.user_login_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_user_login_events_timestamp ON public.user_login_events(login_timestamp DESC);
CREATE INDEX idx_user_login_events_user_id ON public.user_login_events(user_id);
CREATE INDEX idx_pdf_analyses_voice_agent ON public.pdf_analyses(voice_agent_used);