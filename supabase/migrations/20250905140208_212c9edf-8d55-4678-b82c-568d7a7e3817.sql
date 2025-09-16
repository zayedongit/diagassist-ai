-- Update default doctor availability to include weekends
UPDATE doctors SET availability = '{
  "monday": {"available": true, "start": "09:00", "end": "17:00"},
  "tuesday": {"available": true, "start": "09:00", "end": "17:00"},
  "wednesday": {"available": true, "start": "09:00", "end": "17:00"},
  "thursday": {"available": true, "start": "09:00", "end": "17:00"},
  "friday": {"available": true, "start": "09:00", "end": "17:00"},
  "saturday": {"available": true, "start": "10:00", "end": "16:00"},
  "sunday": {"available": true, "start": "10:00", "end": "16:00"}
}'::jsonb WHERE availability->>'saturday' = 'null' OR (availability->'saturday'->>'available')::boolean = false;

-- Update doctors_directory to reflect the same availability
UPDATE doctors_directory SET availability = '{
  "monday": {"available": true, "start": "09:00", "end": "17:00"},
  "tuesday": {"available": true, "start": "09:00", "end": "17:00"},
  "wednesday": {"available": true, "start": "09:00", "end": "17:00"},
  "thursday": {"available": true, "start": "09:00", "end": "17:00"},
  "friday": {"available": true, "start": "09:00", "end": "17:00"},
  "saturday": {"available": true, "start": "10:00", "end": "16:00"},
  "sunday": {"available": true, "start": "10:00", "end": "16:00"}
}'::jsonb WHERE availability->>'saturday' = 'null' OR (availability->'saturday'->>'available')::boolean = false;