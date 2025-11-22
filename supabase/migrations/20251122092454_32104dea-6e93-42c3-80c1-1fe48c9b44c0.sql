-- Create rate limiting table for API calls
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_lookup ON public.api_rate_limits(identifier, endpoint, window_start);

-- Enable RLS on rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage rate limits
CREATE POLICY "Service role can manage rate limits"
ON public.api_rate_limits FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update demo users policy to add expiration (2 hours)
DROP POLICY IF EXISTS "Demo users can view their demo analyses" ON public.pdf_analyses;

CREATE POLICY "Demo users can view recent demo analyses"
ON public.pdf_analyses FOR SELECT
TO anon
USING (
  demo_session_id IS NOT NULL
  AND user_id ~~ 'demo-%'::text
  AND created_at > NOW() - INTERVAL '2 hours'
);

-- Create cleanup function for expired demo data
CREATE OR REPLACE FUNCTION public.cleanup_expired_demo_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pdf_analyses
  WHERE demo_session_id IS NOT NULL
  AND created_at < NOW() - INTERVAL '2 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Cleanup old rate limit records (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM api_rate_limits
  WHERE created_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;