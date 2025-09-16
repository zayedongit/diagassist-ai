-- Update handle_new_user function to include weekend availability for new doctors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Default to 'patient' if user_type is not provided (for phone signup)
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
    COALESCE(new.raw_user_meta_data ->> 'user_type', 'patient'),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    COALESCE(new.raw_user_meta_data ->> 'phone_number', new.phone),
    new.raw_user_meta_data ->> 'specialization',
    new.raw_user_meta_data ->> 'license_number'
  );

  -- If user is a doctor, create doctor record
  IF COALESCE(new.raw_user_meta_data ->> 'user_type', 'patient') = 'doctor' THEN
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
        COALESCE(new.raw_user_meta_data ->> 'first_name', ''),
        ' ',
        COALESCE(new.raw_user_meta_data ->> 'last_name', '')
      ),
      new.raw_user_meta_data ->> 'specialization',
      new.raw_user_meta_data ->> 'license_number',
      new.email,
      COALESCE(new.raw_user_meta_data ->> 'phone_number', new.phone),
      'Experienced healthcare professional committed to providing quality care.',
      COALESCE((new.raw_user_meta_data ->> 'experience_years')::integer, 5),
      COALESCE((new.raw_user_meta_data ->> 'consultation_fee')::integer, 500),
      '{
        "monday": {"available": true, "start": "09:00", "end": "17:00"},
        "tuesday": {"available": true, "start": "09:00", "end": "17:00"},
        "wednesday": {"available": true, "start": "09:00", "end": "17:00"},
        "thursday": {"available": true, "start": "09:00", "end": "17:00"},
        "friday": {"available": true, "start": "09:00", "end": "17:00"},
        "saturday": {"available": true, "start": "10:00", "end": "16:00"},
        "sunday": {"available": true, "start": "10:00", "end": "16:00"}
      }'::jsonb,
      true
    );
  END IF;

  RETURN new;
END;
$function$;