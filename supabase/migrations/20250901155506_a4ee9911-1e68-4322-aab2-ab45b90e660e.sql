-- Fix critical security vulnerability in pdf_analyses table
-- The current SELECT policy allows unrestricted access (true condition)
-- This exposes sensitive medical data to all users

-- Drop the existing vulnerable policy
DROP POLICY IF EXISTS "Users can view their own analyses" ON public.pdf_analyses;

-- Create a secure policy that properly restricts access to user's own analyses
CREATE POLICY "Users can view their own analyses" 
ON public.pdf_analyses 
FOR SELECT 
USING (user_id = auth.uid()::text);

-- Also fix the INSERT and UPDATE policies to be more restrictive
-- Currently they allow anyone to insert/update with 'true' condition

DROP POLICY IF EXISTS "System can insert analyses" ON public.pdf_analyses;
DROP POLICY IF EXISTS "System can update analyses" ON public.pdf_analyses;

-- Create more secure INSERT policy - only allow system/edge functions to insert
-- with proper user_id validation
CREATE POLICY "System can insert analyses" 
ON public.pdf_analyses 
FOR INSERT 
WITH CHECK (
  -- Allow service role (edge functions) to insert
  auth.jwt()->>'role' = 'service_role' OR
  -- Allow authenticated users to insert their own analyses
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);

-- Create more secure UPDATE policy - only allow system/edge functions to update
CREATE POLICY "System can update analyses" 
ON public.pdf_analyses 
FOR UPDATE 
USING (
  -- Allow service role (edge functions) to update
  auth.jwt()->>'role' = 'service_role' OR
  -- Allow users to update their own analyses
  (auth.uid() IS NOT NULL AND user_id = auth.uid()::text)
);