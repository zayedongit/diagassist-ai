-- Add age and gender fields to profiles table for complete patient information
ALTER TABLE public.profiles 
ADD COLUMN age INTEGER,
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));

-- Create index for better performance on gender queries
CREATE INDEX idx_profiles_gender ON public.profiles(gender) WHERE gender IS NOT NULL;