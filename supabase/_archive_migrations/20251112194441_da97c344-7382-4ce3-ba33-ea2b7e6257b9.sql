-- Add admin_alerted column to pdf_analyses table for tracking error notifications
ALTER TABLE pdf_analyses 
ADD COLUMN IF NOT EXISTS admin_alerted BOOLEAN DEFAULT FALSE;

-- Create index for faster admin error queries
CREATE INDEX IF NOT EXISTS idx_pdf_analyses_failed 
ON pdf_analyses(status, admin_alerted) 
WHERE status = 'failed';

-- Add comment for documentation
COMMENT ON COLUMN pdf_analyses.admin_alerted IS 'Tracks whether admin has been notified about analysis errors via SMS';