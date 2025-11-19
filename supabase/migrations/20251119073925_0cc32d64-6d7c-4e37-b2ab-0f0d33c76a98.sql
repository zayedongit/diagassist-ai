-- Add error tracking columns to pdf_analyses table
ALTER TABLE pdf_analyses 
ADD COLUMN IF NOT EXISTS error_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Create index for efficient failed analysis queries
CREATE INDEX IF NOT EXISTS idx_pdf_analyses_failed 
ON pdf_analyses(status, created_at) 
WHERE status = 'failed';

-- Add comment for documentation
COMMENT ON COLUMN pdf_analyses.error_timestamp IS 'Timestamp when the error occurred';
COMMENT ON COLUMN pdf_analyses.retry_count IS 'Number of retry attempts made before failure';