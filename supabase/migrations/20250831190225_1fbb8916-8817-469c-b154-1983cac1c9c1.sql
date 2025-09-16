-- Create user profiles table for both patients and doctors
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type TEXT CHECK (user_type IN ('patient', 'doctor')) NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  specialization TEXT, -- Only for doctors
  license_number TEXT, -- Only for doctors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create consultations table
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES public.pdf_analyses(id),
  status TEXT CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  consultation_type TEXT CHECK (consultation_type IN ('report_review', 'teleconsultation', 'follow_up')) DEFAULT 'report_review',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  symptoms TEXT,
  doctor_notes TEXT,
  diagnosis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  medications JSONB, -- Array of {name, dosage, frequency, duration, instructions}
  additional_instructions TEXT,
  pdf_url TEXT,
  sms_sent BOOLEAN DEFAULT false,
  sms_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policies for consultations
CREATE POLICY "Patients can view their consultations" 
ON public.consultations FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'patient'
  )
);

CREATE POLICY "Doctors can view their consultations" 
ON public.consultations FOR SELECT 
USING (
  doctor_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'doctor'
  )
);

CREATE POLICY "Patients can create consultations" 
ON public.consultations FOR INSERT 
WITH CHECK (
  patient_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'patient'
  )
);

CREATE POLICY "Doctors can update consultations" 
ON public.consultations FOR UPDATE 
USING (
  doctor_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'doctor'
  )
);

-- Create policies for prescriptions
CREATE POLICY "Patients can view their prescriptions" 
ON public.prescriptions FOR SELECT 
USING (
  patient_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'patient'
  )
);

CREATE POLICY "Doctors can manage prescriptions" 
ON public.prescriptions FOR ALL 
USING (
  doctor_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid() AND user_type = 'doctor'
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultations_updated_at
  BEFORE UPDATE ON public.consultations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, user_type, first_name, last_name, phone_number)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'user_type', 'patient'),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone_number'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();