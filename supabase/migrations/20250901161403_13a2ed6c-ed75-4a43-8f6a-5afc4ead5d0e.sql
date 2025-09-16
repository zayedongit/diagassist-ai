-- Fix the overly permissive anonymous access policy
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.pdf_analyses;

-- Create a more secure policy that requires specific conditions for anonymous users
-- Anonymous users should only access data through the edge function, not directly
CREATE POLICY "Users can view their own analyses" 
ON public.pdf_analyses 
FOR SELECT 
USING (
  -- For authenticated users, match by auth.uid()
  ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()::text))
  OR
  -- For service role (edge functions), allow access
  ((auth.jwt() ->> 'role') = 'service_role')
);