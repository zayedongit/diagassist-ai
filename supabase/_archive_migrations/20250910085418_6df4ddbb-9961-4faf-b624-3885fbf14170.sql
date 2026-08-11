-- Create table to track Google Drive processed files
CREATE TABLE public.google_drive_processed_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drive_file_id TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  analysis_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  destination_file_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_drive_processed_files ENABLE ROW LEVEL SECURITY;

-- Create policy for admins only
CREATE POLICY "Admins can manage Google Drive processed files" 
ON public.google_drive_processed_files 
FOR ALL 
USING (current_user_has_role('admin'::user_role));

-- Create index for efficient lookups
CREATE INDEX idx_google_drive_files_drive_id ON public.google_drive_processed_files(drive_file_id);
CREATE INDEX idx_google_drive_files_status ON public.google_drive_processed_files(status);

-- Create trigger for updated_at
CREATE TRIGGER update_google_drive_processed_files_updated_at
BEFORE UPDATE ON public.google_drive_processed_files
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();