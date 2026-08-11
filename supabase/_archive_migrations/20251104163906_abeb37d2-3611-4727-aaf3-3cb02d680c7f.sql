-- Create sms_verifications table for OTP storage
CREATE TABLE IF NOT EXISTS public.sms_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  message_sid TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_sms_verifications_phone ON public.sms_verifications(phone_number);
CREATE INDEX idx_sms_verifications_expires ON public.sms_verifications(expires_at);

-- Enable RLS
ALTER TABLE public.sms_verifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage all records (for edge functions)
CREATE POLICY "Service role can manage all sms verifications"
  ON public.sms_verifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);