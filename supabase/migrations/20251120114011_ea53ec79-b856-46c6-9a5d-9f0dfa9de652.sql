-- Add admin notification tracking columns
ALTER TABLE pdf_analyses
ADD COLUMN IF NOT EXISTS admin_notified_success BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_notified_at TIMESTAMP WITH TIME ZONE;

-- Create index for querying notification status
CREATE INDEX IF NOT EXISTS idx_pdf_analyses_notifications 
ON pdf_analyses(admin_notified_success, admin_alerted, status);