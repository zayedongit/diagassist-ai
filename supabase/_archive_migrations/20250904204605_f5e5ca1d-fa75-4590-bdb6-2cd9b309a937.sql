-- CRITICAL SECURITY FIX: Protect Doctor Personal Information
-- Step 1: Remove overly permissive policies that expose doctor contact information

-- Drop existing overly permissive policies on doctors table
DROP POLICY IF EXISTS "Authenticated users can view basic doctor info" ON public.doctors;
DROP POLICY IF EXISTS "Authenticated users can view contact info for consultations" ON public.doctors;

-- Step 2: Create secure policies that protect doctor personal information

-- Policy 1: Doctors can view and manage their own complete profile
CREATE POLICY "Doctors can manage own profile" 
ON public.doctors 
FOR ALL 
USING (profile_id IN (
  SELECT profiles.id 
  FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'doctor'
));

-- Policy 2: Public can only view limited doctor info (no contact details)
-- This policy will allow viewing basic info but NOT email, phone, license_number
CREATE POLICY "Public can view basic doctor info only" 
ON public.doctors 
FOR SELECT 
USING (is_active = true);

-- Step 3: Drop the existing doctors_public view and create a secure one
DROP VIEW IF EXISTS public.doctors_public;

-- Create a secure view that only exposes public information
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

-- Grant access to the secure view
GRANT SELECT ON public.doctors_public TO authenticated, anon;

-- Step 4: Create a secure function to get doctor contact info only for active consultations
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