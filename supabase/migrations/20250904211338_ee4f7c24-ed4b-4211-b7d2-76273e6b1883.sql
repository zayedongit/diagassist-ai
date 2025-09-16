-- Create SMS notifications log table for audit trail
CREATE TABLE public.sms_notifications_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('appointment_booking', 'prescription_ready', 'appointment_reminder', 'general')),
  message_content TEXT NOT NULL,
  twilio_sid TEXT,
  status TEXT,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on SMS log table
ALTER TABLE public.sms_notifications_log ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to manage SMS logs
CREATE POLICY "Service role can manage SMS logs" 
ON public.sms_notifications_log 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create policy for doctors to view SMS logs related to their consultations
CREATE POLICY "Doctors can view SMS logs for their patients" 
ON public.sms_notifications_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM consultations c
    JOIN profiles dp ON dp.id = c.doctor_id
    JOIN profiles pp ON pp.id = c.patient_id
    WHERE dp.user_id = auth.uid() 
      AND dp.user_type = 'doctor'
      AND pp.phone_number = sms_notifications_log.phone_number
  )
);

-- Add indexes for better performance
CREATE INDEX idx_sms_log_phone_number ON public.sms_notifications_log(phone_number);
CREATE INDEX idx_sms_log_sent_at ON public.sms_notifications_log(sent_at);
CREATE INDEX idx_sms_log_message_type ON public.sms_notifications_log(message_type);

-- Add audit trigger for SMS notifications
CREATE OR REPLACE FUNCTION public.update_sms_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Comment the table for documentation
COMMENT ON TABLE public.sms_notifications_log IS 'Audit log for all SMS notifications sent through the system including appointment bookings, prescription notifications, and reminders';