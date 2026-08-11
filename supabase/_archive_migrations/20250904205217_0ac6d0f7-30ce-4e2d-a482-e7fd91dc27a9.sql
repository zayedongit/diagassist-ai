-- FINAL SECURITY FIX: Remove the overly permissive public policy on doctors table
-- This policy was still allowing access to sensitive contact information

-- Drop the problematic policy that exposes sensitive data
DROP POLICY IF EXISTS "Public can view basic doctor info only" ON public.doctors;

-- Instead of allowing any access to the doctors table, users should only use:
-- 1. The secure doctors_public VIEW for basic information
-- 2. The get_doctor_contact_for_consultation FUNCTION for contact info during active consultations

-- Add a comment to document the security approach
COMMENT ON TABLE public.doctors IS 'Direct access restricted. Use doctors_public view for basic info or get_doctor_contact_for_consultation() function for contact details during active consultations only.';

-- Ensure the doctors_public view has proper permissions
-- (This was already done in previous migration, but ensuring it's set)
GRANT SELECT ON public.doctors_public TO authenticated, anon;

-- Create a policy that only allows system functions to access the full table for legitimate operations
-- This ensures only our secure functions can access sensitive data, not direct queries
CREATE POLICY "System access only for doctors table" 
ON public.doctors 
FOR SELECT 
USING (
  -- Only allow access if the current user is a doctor viewing their own record
  -- OR if being accessed via a security definer function (which runs with elevated privileges)
  profile_id IN (
    SELECT profiles.id 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() AND profiles.user_type = 'doctor'
  )
);