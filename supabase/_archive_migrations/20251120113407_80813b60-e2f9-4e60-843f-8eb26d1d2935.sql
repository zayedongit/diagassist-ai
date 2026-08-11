-- Create storage bucket for analysis reports
INSERT INTO storage.buckets (id, name, public)
VALUES ('analysis-reports', 'analysis-reports', false);

-- Create RLS policies for analysis reports bucket
CREATE POLICY "Users can view their own analysis reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'analysis-reports' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own analysis reports"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'analysis-reports' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own analysis reports"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'analysis-reports' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Service role can manage all analysis reports"
ON storage.objects FOR ALL
USING (bucket_id = 'analysis-reports');

-- Add columns to pdf_analyses for tracking stored files
ALTER TABLE pdf_analyses
ADD COLUMN IF NOT EXISTS comprehensive_report_path TEXT,
ADD COLUMN IF NOT EXISTS plan_report_path TEXT,
ADD COLUMN IF NOT EXISTS exported_to_drive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS drive_file_id TEXT;