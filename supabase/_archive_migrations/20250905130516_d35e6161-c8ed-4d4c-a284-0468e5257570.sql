
-- 1) Deduplicate profiles per user_id, keeping the "doctor" row if present, otherwise the newest.
--    Then fix any foreign keys in related tables to point to the kept profile.

BEGIN;

-- Rank profiles so that we prefer 'doctor' rows first, then newest by created_at, then updated_at, then id.
WITH ranked AS (
  SELECT
    id,
    user_id,
    user_type,
    created_at,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY
        CASE WHEN user_type = 'doctor' THEN 1 ELSE 0 END DESC,
        created_at DESC NULLS LAST,
        updated_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM public.profiles
),
keepers AS (
  SELECT user_id, id AS keep_id
  FROM ranked
  WHERE rn = 1
),
dups AS (
  SELECT user_id, id AS dup_id
  FROM ranked
  WHERE rn > 1
)

-- Update doctors.profile_id that point to duplicate profile rows
UPDATE public.doctors d
SET profile_id = k.keep_id
FROM dups dp
JOIN keepers k ON k.user_id = dp.user_id
WHERE d.profile_id = dp.dup_id;

-- Update consultations.patient_id
UPDATE public.consultations c
SET patient_id = k.keep_id
FROM dups dp
JOIN keepers k ON k.user_id = dp.user_id
WHERE c.patient_id = dp.dup_id;

-- Update consultations.doctor_id
UPDATE public.consultations c
SET doctor_id = k.keep_id
FROM dups dp
JOIN keepers k ON k.user_id = dp.user_id
WHERE c.doctor_id = dp.dup_id;

-- Update prescriptions.patient_id
UPDATE public.prescriptions p
SET patient_id = k.keep_id
FROM dups dp
JOIN keepers k ON k.user_id = dp.user_id
WHERE p.patient_id = dp.dup_id;

-- Update prescriptions.doctor_id
UPDATE public.prescriptions p
SET doctor_id = k.keep_id
FROM dups dp
JOIN keepers k ON k.user_id = dp.user_id
WHERE p.doctor_id = dp.dup_id;

-- Delete the duplicate profile rows
DELETE FROM public.profiles p
USING dups dp
WHERE p.id = dp.dup_id;

-- 2) Prevent future duplicates:
-- Create a unique index on user_id for non-null values
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
ON public.profiles(user_id)
WHERE user_id IS NOT NULL;

COMMIT;
