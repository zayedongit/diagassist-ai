-- Add terms_accepted_at column to profiles table for legal compliance
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;