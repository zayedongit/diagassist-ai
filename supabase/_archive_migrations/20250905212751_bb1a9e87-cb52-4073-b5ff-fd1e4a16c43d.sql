-- Fix the security warning by setting search_path for the function
CREATE OR REPLACE FUNCTION notify_doctor_prescription_request()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;