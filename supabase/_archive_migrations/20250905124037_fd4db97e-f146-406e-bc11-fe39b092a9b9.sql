-- Create user roles system for proper RBAC
CREATE TYPE public.user_role AS ENUM ('admin', 'doctor', 'patient');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if current user has a role
CREATE OR REPLACE FUNCTION public.current_user_has_role(_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), _role)
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.current_user_has_role('admin'));

-- Replace doctors_public view with proper RLS-enabled table
DROP TABLE IF EXISTS public.doctors_public;

CREATE TABLE public.doctors_directory (
    id UUID PRIMARY KEY,
    name TEXT,
    specialization TEXT,
    bio TEXT,
    experience_years INTEGER,
    consultation_fee INTEGER,
    profile_image_url TEXT,
    is_active BOOLEAN,
    availability JSONB,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on doctors_directory
ALTER TABLE public.doctors_directory ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view active doctors (public directory)
CREATE POLICY "Anyone can view active doctors directory"
ON public.doctors_directory
FOR SELECT
USING (is_active = true);

-- Only system can insert/update (via triggers)
CREATE POLICY "System can manage doctors directory"
ON public.doctors_directory
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create trigger function to sync doctors table with directory
CREATE OR REPLACE FUNCTION public.sync_doctors_directory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.doctors_directory (
      id, name, specialization, bio, experience_years, 
      consultation_fee, profile_image_url, is_active, 
      availability, created_at
    ) VALUES (
      NEW.id, NEW.name, NEW.specialization, NEW.bio, 
      NEW.experience_years, NEW.consultation_fee, 
      NEW.profile_image_url, NEW.is_active, 
      NEW.availability, NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      specialization = EXCLUDED.specialization,
      bio = EXCLUDED.bio,
      experience_years = EXCLUDED.experience_years,
      consultation_fee = EXCLUDED.consultation_fee,
      profile_image_url = EXCLUDED.profile_image_url,
      is_active = EXCLUDED.is_active,
      availability = EXCLUDED.availability,
      updated_at = now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.doctors_directory WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger to sync doctors table changes to directory
CREATE TRIGGER sync_doctors_directory_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.sync_doctors_directory();

-- Populate doctors_directory with existing data
INSERT INTO public.doctors_directory (
  id, name, specialization, bio, experience_years, 
  consultation_fee, profile_image_url, is_active, 
  availability, created_at
)
SELECT 
  id, name, specialization, bio, experience_years, 
  consultation_fee, profile_image_url, is_active, 
  availability, created_at
FROM public.doctors
WHERE is_active = true;