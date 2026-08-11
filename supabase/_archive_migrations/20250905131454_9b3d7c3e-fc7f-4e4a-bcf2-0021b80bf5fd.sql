-- Fix the duplicate profile issue by keeping only the doctor profile
DELETE FROM public.profiles 
WHERE user_id = 'd244be77-d22a-4f3b-b3f1-d7a3d888f44d' 
AND user_type = 'patient';