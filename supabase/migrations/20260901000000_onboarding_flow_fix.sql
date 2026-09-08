-- Make handle nullable so a profile row can exist before onboarding is complete.
-- The onboarding guard in destinationForUser() checks handle IS NULL to redirect
-- users who haven't finished onboarding yet.
ALTER TABLE public.profiles
  ALTER COLUMN handle DROP NOT NULL;

-- Also make display_name nullable — the profile row is now created empty on signup
-- and only fully populated when the user completes onboarding (Step 3 Finish).
ALTER TABLE public.profiles
  ALTER COLUMN display_name DROP NOT NULL;

-- Drop the trigger that auto-created a complete profile row on signup.
-- This was the root cause: it wrote a handle immediately, so destinationForUser()
-- always returned /me and onboarding was never reached.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Update validate_handle to allow NULL (only validate when a value is actually set).
CREATE OR REPLACE FUNCTION public.validate_handle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.handle IS NOT NULL AND NEW.handle !~ '^[a-z0-9_]{4,}$' THEN
    RAISE EXCEPTION 'Handle must be at least 4 characters and contain only lowercase letters, numbers, and underscores';
  END IF;
  RETURN NEW;
END;
$$;
