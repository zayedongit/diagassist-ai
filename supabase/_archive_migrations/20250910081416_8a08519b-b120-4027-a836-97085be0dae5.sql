-- Fix security issue: Restrict doctors directory access to authenticated users only
-- This prevents public exposure of doctor contact information while maintaining app functionality

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active doctors directory" ON public.doctors_directory;

-- Create a more secure policy that requires authentication
CREATE POLICY "Authenticated users can view active doctors directory" 
ON public.doctors_directory 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Ensure the system can still manage the directory
-- The existing "System can manage doctors directory" policy remains unchanged