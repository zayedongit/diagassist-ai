-- Add admin_alerted column to pdf_analyses table
ALTER TABLE pdf_analyses
ADD COLUMN IF NOT EXISTS admin_alerted BOOLEAN DEFAULT FALSE;

-- Create index for querying failed analyses that need admin attention
CREATE INDEX IF NOT EXISTS idx_pdf_analyses_admin_alerted 
ON pdf_analyses(admin_alerted, status) 
WHERE status = 'failed';