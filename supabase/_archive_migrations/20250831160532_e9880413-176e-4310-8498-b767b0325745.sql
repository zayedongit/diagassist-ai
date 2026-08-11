-- Create a table to store PDF analysis results
CREATE TABLE public.pdf_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pdf_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own analyses" 
ON public.pdf_analyses 
FOR SELECT 
USING (true); -- For now, allow all access since we're using anonymous users

CREATE POLICY "System can insert analyses" 
ON public.pdf_analyses 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update analyses" 
ON public.pdf_analyses 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pdf_analyses_updated_at
BEFORE UPDATE ON public.pdf_analyses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();