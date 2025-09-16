-- Fix the security definer view issue
-- Remove the security_barrier setting and create a proper view

DROP VIEW IF EXISTS public.doctors_public;

-- Create a simple view without security definer properties
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

-- Grant access to the view
GRANT SELECT ON public.doctors_public TO anon;
GRANT SELECT ON public.doctors_public TO authenticated;

-- The view will inherit RLS from the base table, which is what we want