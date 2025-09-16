-- Create doctors table for teleconsultation profiles
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  license_number TEXT,
  experience_years INTEGER,
  consultation_fee INTEGER DEFAULT 500, -- in cents
  availability JSONB DEFAULT '{}', -- store available time slots
  bio TEXT,
  profile_image_url TEXT,
  phone_number TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on doctors table
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Create policies for doctors table
CREATE POLICY "Anyone can view active doctors" 
ON public.doctors 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Doctors can update their own profile" 
ON public.doctors 
FOR UPDATE 
USING (profile_id IN (
  SELECT id FROM public.profiles 
  WHERE user_id = auth.uid() AND user_type = 'doctor'
));

-- Add scheduled_at and doctor_id columns to consultations table if not exists
ALTER TABLE public.consultations 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS selected_doctor_id UUID REFERENCES public.doctors(id);

-- Insert sample doctors for teleconsultation
INSERT INTO public.doctors (name, specialization, license_number, experience_years, consultation_fee, bio, phone_number, email, availability) VALUES 
('Dr. Sarah Mitchell', 'General Medicine', 'GMC001', 8, 750, 'Experienced general practitioner specializing in preventive care and chronic disease management.', '+1-555-0101', 'sarah.mitchell@healthcenter.com', '{"monday": ["09:00", "17:00"], "tuesday": ["09:00", "17:00"], "wednesday": ["09:00", "17:00"], "thursday": ["09:00", "17:00"], "friday": ["09:00", "15:00"]}'),
('Dr. Michael Chen', 'Cardiology', 'CARD002', 12, 1200, 'Board-certified cardiologist with expertise in heart disease prevention and treatment.', '+1-555-0102', 'michael.chen@heartcare.com', '{"monday": ["08:00", "16:00"], "wednesday": ["08:00", "16:00"], "friday": ["08:00", "16:00"]}'),
('Dr. Emily Rodriguez', 'Endocrinology', 'ENDO003', 10, 1000, 'Diabetes and hormone specialist focused on metabolic health and thyroid disorders.', '+1-555-0103', 'emily.rodriguez@endocare.com', '{"tuesday": ["10:00", "18:00"], "thursday": ["10:00", "18:00"], "saturday": ["09:00", "13:00"]}'),
('Dr. James Thompson', 'Orthopedics', 'ORTHO004', 15, 1100, 'Orthopedic surgeon specializing in joint health and sports medicine.', '+1-555-0104', 'james.thompson@orthocenter.com', '{"monday": ["07:00", "15:00"], "tuesday": ["07:00", "15:00"], "thursday": ["07:00", "15:00"]}'),
('Dr. Lisa Wang', 'Dermatology', 'DERM005', 7, 900, 'Dermatologist specializing in skin health, allergies, and cosmetic dermatology.', '+1-555-0105', 'lisa.wang@skincare.com', '{"monday": ["11:00", "19:00"], "wednesday": ["11:00", "19:00"], "friday": ["11:00", "19:00"]}');

-- Create trigger for updating doctors updated_at
CREATE TRIGGER update_doctors_updated_at
BEFORE UPDATE ON public.doctors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();