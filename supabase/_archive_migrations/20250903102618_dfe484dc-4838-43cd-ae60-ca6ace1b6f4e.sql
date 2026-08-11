-- Fix doctors table security vulnerability
-- Remove public access to sensitive doctor information

-- Drop the problematic public policy that exposes sensitive data
DROP POLICY IF EXISTS "Public can view basic doctor info for booking" ON public.doctors;

-- Create a secure view for public booking information (only non-sensitive data)
CREATE OR REPLACE VIEW public.doctors_public AS
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

-- Grant public access to the safe view only
GRANT SELECT ON public.doctors_public TO anon;
GRANT SELECT ON public.doctors_public TO authenticated;