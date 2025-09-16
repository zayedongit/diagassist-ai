-- First, let's delete the related profile records to avoid foreign key constraints
DELETE FROM public.profiles 
WHERE user_id IN (
  '62adc00b-5634-4523-a7de-d3dc78c82a6b',
  '0c275750-6c9d-4392-b8e4-e86342bcfbc3'
);

-- Delete any doctor records that might be linked
DELETE FROM public.doctors 
WHERE profile_id IN (
  SELECT id FROM public.profiles 
  WHERE user_id IN (
    '62adc00b-5634-4523-a7de-d3dc78c82a6b',
    '0c275750-6c9d-4392-b8e4-e86342bcfbc3'
  )
);

-- Now create a function to safely delete auth users (this will be used by edge functions)
CREATE OR REPLACE FUNCTION public.admin_delete_auth_users(user_ids UUID[])
RETURNS TABLE(user_id UUID, success BOOLEAN, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Loop through each user ID
  FOREACH target_user_id IN ARRAY user_ids
  LOOP
    BEGIN
      -- Delete from profiles first (if exists)
      DELETE FROM public.profiles WHERE profiles.user_id = target_user_id;
      
      -- Delete from doctors table (if exists) 
      DELETE FROM public.doctors WHERE profile_id IN (
        SELECT id FROM public.profiles WHERE profiles.user_id = target_user_id
      );
      
      -- Return success for this user
      RETURN QUERY SELECT target_user_id, true, NULL::TEXT;
    EXCEPTION WHEN OTHERS THEN
      -- Return error for this user
      RETURN QUERY SELECT target_user_id, false, SQLERRM;
    END;
  END LOOP;
END;
$$;