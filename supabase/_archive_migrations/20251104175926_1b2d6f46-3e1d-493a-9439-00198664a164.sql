-- Create table for storing PDF analysis results
CREATE TABLE IF NOT EXISTS public.pdf_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT,
  pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_pdf_analyses_user_id ON public.pdf_analyses(user_id);

-- Create index on status for cleanup queries
CREATE INDEX IF NOT EXISTS idx_pdf_analyses_status ON public.pdf_analyses(status);

-- Create index on updated_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_pdf_analyses_updated_at ON public.pdf_analyses(updated_at);

-- Enable RLS
ALTER TABLE public.pdf_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own analyses (including anonymous users)
CREATE POLICY "Users can view their own analyses"
  ON public.pdf_analyses
  FOR SELECT
  USING (auth.uid()::text = user_id OR user_id LIKE 'anonymous-%');

-- Policy: Users can insert their own analyses
CREATE POLICY "Users can insert their own analyses"
  ON public.pdf_analyses
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id OR user_id LIKE 'anonymous-%');

-- Policy: Users can update their own analyses
CREATE POLICY "Users can update their own analyses"
  ON public.pdf_analyses
  FOR UPDATE
  USING (auth.uid()::text = user_id OR user_id LIKE 'anonymous-%');

-- Policy: Users can delete their own analyses
CREATE POLICY "Users can delete their own analyses"
  ON public.pdf_analyses
  FOR DELETE
  USING (auth.uid()::text = user_id OR user_id LIKE 'anonymous-%');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_pdf_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_pdf_analyses_timestamp
  BEFORE UPDATE ON public.pdf_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pdf_analyses_updated_at();