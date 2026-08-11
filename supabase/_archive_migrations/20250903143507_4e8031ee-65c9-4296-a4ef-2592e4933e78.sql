-- Create or replace function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (
    user_id,
    user_type,
    first_name,
    last_name,
    phone_number,
    specialization,
    license_number
  ) VALUES (
    new.id,
    new.raw_user_meta_data ->> 'user_type',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'phone_number',
    new.raw_user_meta_data ->> 'specialization',
    new.raw_user_meta_data ->> 'license_number'
  );

  -- If user is a doctor, create doctor record
  IF (new.raw_user_meta_data ->> 'user_type') = 'doctor' THEN
    INSERT INTO public.doctors (
      profile_id,
      name,
      specialization,
      license_number,
      email,
      phone_number,
      bio,
      experience_years,
      consultation_fee,
      availability,
      is_active
    ) VALUES (
      (SELECT id FROM public.profiles WHERE user_id = new.id),
      CONCAT(
        new.raw_user_meta_data ->> 'first_name',
        ' ',
        new.raw_user_meta_data ->> 'last_name'
      ),
      new.raw_user_meta_data ->> 'specialization',
      new.raw_user_meta_data ->> 'license_number',
      new.email,
      new.raw_user_meta_data ->> 'phone_number',
      'Experienced healthcare professional committed to providing quality care.',
      5, -- Default experience years
      500, -- Default consultation fee
      '{
        "monday": {"available": true, "start": "09:00", "end": "17:00"},
        "tuesday": {"available": true, "start": "09:00", "end": "17:00"},
        "wednesday": {"available": true, "start": "09:00", "end": "17:00"},
        "thursday": {"available": true, "start": "09:00", "end": "17:00"},
        "friday": {"available": true, "start": "09:00", "end": "17:00"},
        "saturday": {"available": false, "start": null, "end": null},
        "sunday": {"available": false, "start": null, "end": null}
      }'::jsonb,
      true
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow doctors to insert into doctors table during signup process
DROP POLICY IF EXISTS "Doctors can create their profile during signup" ON public.doctors;
CREATE POLICY "Doctors can create their profile during signup"
ON public.doctors
FOR INSERT
WITH CHECK (
  profile_id IN (
    SELECT id FROM public.profiles 
    WHERE user_id = auth.uid() AND user_type = 'doctor'
  )
);