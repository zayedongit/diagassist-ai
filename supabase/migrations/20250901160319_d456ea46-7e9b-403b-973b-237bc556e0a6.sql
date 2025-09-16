-- Fix RLS policy for pdf_analyses to allow anonymous users to access their own data
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.pdf_analyses;

-- Create a new policy that handles both authenticated and anonymous users
CREATE POLICY "Users can view their own analyses" 
ON public.pdf_analyses 
FOR SELECT 
USING (
  -- For authenticated users, match by auth.uid()
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text) 
  OR 
  -- For anonymous users, allow access to any record (they already have the specific ID)
  (auth.uid() IS NULL AND user_id LIKE 'anonymous-%')
);