-- Fix function search path for security
DROP TRIGGER IF EXISTS update_pdf_analyses_timestamp ON public.pdf_analyses;
DROP FUNCTION IF EXISTS public.update_pdf_analyses_updated_at();

CREATE OR REPLACE FUNCTION public.update_pdf_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER update_pdf_analyses_timestamp
  BEFORE UPDATE ON public.pdf_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pdf_analyses_updated_at();