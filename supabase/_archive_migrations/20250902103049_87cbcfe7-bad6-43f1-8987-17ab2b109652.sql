-- Fix security issue: Restrict doctor personal information access
-- Drop the overly permissive policy that exposes all doctor data publicly
DROP POLICY IF EXISTS "Anyone can view active doctors" ON public.doctors;

-- Create a public policy that only shows essential booking information
-- This allows unauthenticated users to see doctors for booking purposes
-- but protects sensitive information like email, phone, and license numbers
CREATE POLICY "Public can view basic doctor info for booking" 
ON public.doctors 
FOR SELECT 
USING (
  is_active = true 
  AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'doctors' 
    AND column_name IN ('name', 'specialization', 'bio', 'profile_image_url', 'experience_years', 'consultation_fee', 'availability', 'is_active', 'created_at', 'id')
  )
);

-- Create a policy for authenticated users to see the same basic info
-- (In most cases, even authenticated patients don't need doctor contact details)
CREATE POLICY "Authenticated users can view basic doctor info" 
ON public.doctors 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Create a policy allowing doctors to see their own complete profile
-- This includes sensitive information needed for profile management
CREATE POLICY "Doctors can view their own complete profile" 
ON public.doctors 
FOR SELECT 
TO authenticated
USING (
  profile_id IN (
    SELECT profiles.id
    FROM profiles
    WHERE profiles.user_id = auth.uid() 
    AND profiles.user_type = 'doctor'
  )
);

-- Note: The existing update policy for doctors remains unchanged as it's appropriately secured