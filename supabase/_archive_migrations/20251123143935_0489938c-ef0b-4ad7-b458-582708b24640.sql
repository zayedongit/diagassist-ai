-- Create storage_alerts table for tracking storage thresholds and exports
CREATE TABLE IF NOT EXISTS storage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_reached INTEGER NOT NULL,
  total_reports INTEGER NOT NULL,
  alerted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  exported_at TIMESTAMP WITH TIME ZONE,
  export_count INTEGER,
  export_method TEXT CHECK (export_method IN ('manual', 'automatic')),
  admin_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE storage_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view storage alerts"
  ON storage_alerts FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage storage alerts"
  ON storage_alerts FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_storage_alerts_threshold ON storage_alerts(threshold_reached);
CREATE INDEX IF NOT EXISTS idx_storage_alerts_alerted_at ON storage_alerts(alerted_at);