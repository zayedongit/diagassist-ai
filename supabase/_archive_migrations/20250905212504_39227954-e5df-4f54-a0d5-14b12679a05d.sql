-- Add prescription request tracking to consultations table
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS prescription_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS prescription_requested_at TIMESTAMP WITH TIME ZONE;

-- Create a function to send SMS when prescription is requested
CREATE OR REPLACE FUNCTION notify_doctor_prescription_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if prescription_requested changed from false to true
  IF OLD.prescription_requested = FALSE AND NEW.prescription_requested = TRUE THEN
    -- Insert into a notification queue table that our edge function can process
    INSERT INTO doctor_prescription_notifications (
      consultation_id,
      doctor_id,
      patient_id,
      created_at
    ) VALUES (
      NEW.id,
      NEW.selected_doctor_id,
      NEW.patient_id,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification queue table
CREATE TABLE IF NOT EXISTS doctor_prescription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES consultations(id),
  doctor_id UUID,
  patient_id UUID,
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE doctor_prescription_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can manage prescription notifications" 
ON doctor_prescription_notifications 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create trigger
CREATE TRIGGER notify_doctor_prescription_request_trigger
  AFTER UPDATE ON consultations
  FOR EACH ROW
  EXECUTE FUNCTION notify_doctor_prescription_request();