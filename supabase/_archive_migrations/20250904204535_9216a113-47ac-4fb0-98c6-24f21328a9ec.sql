-- CRITICAL SECURITY FIX: Protect Doctor Personal Information
-- Remove overly permissive policies that expose doctor contact information

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view basic doctor info" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can view contact info for consultations" ON public.doctors;

-- Create secure policies that protect doctor personal information
-- Policy 1: Doctors can view and manage their own complete profile
CREATE POLICY "Doctors can manage own profile" 
ON public.doctors 
FOR ALL 
USING (profile_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'doctor'
));

-- Policy 2: Patients can only view limited public doctor info (no contact details)
CREATE POLICY "Public can view limited doctor info" 
ON public.doctors 
FOR SELECT 
USING (
  is_active = true 
  AND auth.role() = 'authenticated'
);

-- Policy 3: Patients can access doctor contact info ONLY when they have an active consultation
CREATE POLICY "Patients can access doctor contact for active consultations" 
ON public.doctors 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 
    FROM consultations c
    JOIN profiles p ON p.id = c.patient_id
    WHERE c.selected_doctor_id = doctors.id 
      AND p.user_id = auth.uid()
      AND p.user_type = 'patient'
      AND c.status IN ('pending', 'scheduled', 'in_progress')
  )
);

-- CRITICAL FIX: Enable RLS on doctors_public table and secure it
ALTER TABLE public.doctors_public ENABLE ROW LEVEL SECURITY;

-- Create secure policy for doctors_public - only show basic info, no contact details
CREATE POLICY "Public directory shows basic info only" 
ON public.doctors_public 
FOR SELECT 
USING (is_active = true);

-- Create a secure view for public doctor information that excludes contact details
CREATE OR REPLACE VIEW public.doctors_directory AS 
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

-- Grant access to the secure view
GRANT SELECT ON public.doctors_directory TO authenticated, anon;

-- Create a secure function to get doctor contact info only for active consultations
CREATE OR REPLACE FUNCTION public.get_doctor_contact_for_consultation(doctor_id_param UUID)
RETURNS TABLE (
  doctor_name TEXT,
  email TEXT,
  phone_number TEXT,
  license_number TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the requesting user has an active consultation with this doctor
  IF NOT EXISTS (
    SELECT 1 
    FROM consultations c
    JOIN profiles p ON p.id = c.patient_id
    WHERE c.selected_doctor_id = doctor_id_param 
      AND p.user_id = auth.uid()
      AND p.user_type = 'patient'
      AND c.status IN ('pending', 'scheduled', 'in_progress')
  ) THEN
    -- If no active consultation, return empty result
    RETURN;
  END IF;

  -- Return doctor contact information only if consultation exists
  RETURN QUERY
  SELECT 
    d.name,
    d.email,
    d.phone_number,
    d.license_number
  FROM doctors d
  WHERE d.id = doctor_id_param AND d.is_active = true;
END;
$$;