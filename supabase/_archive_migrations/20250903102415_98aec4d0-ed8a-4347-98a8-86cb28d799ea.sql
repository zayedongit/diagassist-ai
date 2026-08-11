-- Fix doctors table security vulnerability
-- Remove public access to sensitive doctor information

-- Drop the problematic public policy
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

-- Ensure only authenticated users can see full doctor profiles
-- Keep existing policies for authenticated access to full table:
-- "Authenticated users can view basic doctor info" 
-- "Doctors can update their own profile"
-- "Doctors can view their own complete profile"

-- Add a policy for authenticated users to access contact info when needed
CREATE POLICY "Authenticated users can view contact info for consultations" 
ON public.doctors 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Create RLS on the view (though views inherit from base table)
ALTER VIEW public.doctors_public SET (security_barrier = true);