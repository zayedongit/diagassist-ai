-- Fix the security definer view issue
-- Recreate the view without security definer property

DROP VIEW IF EXISTS public.doctors_public;

-- Create a standard view (not security definer) for public booking information
CREATE VIEW public.doctors_public AS
SELECT 
  id,
  name,
  specialization,
  bio,
  profile_image_url,
  experience_years,
  consultation_fee,
  availability,
  is_active,
  created_at
FROM public.doctors
WHERE is_active = true;

-- Grant public access to the safe view
GRANT SELECT ON public.doctors_public TO anon;
GRANT SELECT ON public.doctors_public TO authenticated;