-- Create table for report shares
CREATE TABLE public.report_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL,
  user_id text NOT NULL,
  share_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  accessed_at timestamp with time zone,
  access_count integer DEFAULT 0,
  revoked boolean DEFAULT false,
  notes text
);

-- Create index for faster token lookups
CREATE INDEX idx_report_shares_token ON public.report_shares(share_token);
CREATE INDEX idx_report_shares_report_id ON public.report_shares(report_id);

-- Enable RLS
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- Users can view their own shares
CREATE POLICY "Users can view their own report shares"
ON public.report_shares
FOR SELECT
USING (user_id = (auth.uid())::text OR user_id LIKE 'anonymous-%');

-- Users can create shares for their own reports
CREATE POLICY "Users can create report shares"
ON public.report_shares
FOR INSERT
WITH CHECK (user_id = (auth.uid())::text OR user_id LIKE 'anonymous-%');

-- Users can update their own shares (revoke, etc)
CREATE POLICY "Users can update their own report shares"
ON public.report_shares
FOR UPDATE
USING (user_id = (auth.uid())::text OR user_id LIKE 'anonymous-%');

-- Users can delete their own shares
CREATE POLICY "Users can delete their own report shares"
ON public.report_shares
FOR DELETE
USING (user_id = (auth.uid())::text OR user_id LIKE 'anonymous-%');

-- Service role can manage all shares
CREATE POLICY "Service role can manage all report shares"
ON public.report_shares
FOR ALL
USING (true)
WITH CHECK (true);

-- Add trigger to update timestamps
CREATE TRIGGER update_report_shares_updated_at
  BEFORE UPDATE ON public.report_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();