-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_config JSONB,
  handle_changed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.validate_handle()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.handle !~ '^[a-z0-9_]{4,}$' THEN
    RAISE EXCEPTION 'Handle must be at least 4 characters and contain only lowercase letters, numbers, and underscores';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_validate_handle
BEFORE INSERT OR UPDATE OF handle ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_handle();

GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- HANDLE HISTORY
CREATE TABLE public.handle_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  old_handle TEXT NOT NULL,
  new_handle TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX handle_history_user_id_idx ON public.handle_history(user_id);

GRANT SELECT ON public.handle_history TO authenticated;
GRANT ALL ON public.handle_history TO service_role;

ALTER TABLE public.handle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own handle history"
  ON public.handle_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- log handle changes automatically
CREATE OR REPLACE FUNCTION public.log_handle_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.handle IS DISTINCT FROM OLD.handle THEN
    INSERT INTO public.handle_history (user_id, old_handle, new_handle)
    VALUES (NEW.id, OLD.handle, NEW.handle);
    NEW.handle_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_log_handle_change
BEFORE UPDATE OF handle ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_handle_change();

-- OAUTH CLIENTS (backend/admin only)
CREATE TABLE public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL UNIQUE,
  client_secret TEXT NOT NULL,
  name TEXT NOT NULL,
  allowed_redirect_uris TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.oauth_clients TO service_role;

ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
-- No policies: unreachable via the Data API for anon/authenticated.

-- AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_handle TEXT;
  final_handle TEXT;
  suffix INT := 0;
BEGIN
  base_handle := lower(regexp_replace(
    coalesce(
      NEW.raw_user_meta_data->>'handle',
      split_part(coalesce(NEW.email, 'user'), '@', 1)
    ),
    '[^a-zA-Z0-9_]', '', 'g'
  ));

  IF length(base_handle) < 4 THEN
    base_handle := base_handle || 'user';
  END IF;
  base_handle := left(base_handle, 24);

  final_handle := base_handle;
  WHILE EXISTS (SELECT 1 FROM public.profiles p WHERE p.handle = final_handle) LOOP
    suffix := suffix + 1;
    final_handle := left(base_handle, 20) || suffix::text;
  END LOOP;

  INSERT INTO public.profiles (id, handle, display_name, avatar_config)
  VALUES (
    NEW.id,
    final_handle,
    coalesce(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      final_handle
    ),
    jsonb_build_object('seed', final_handle, 'style', 'thumbs', 'options', '{}'::jsonb)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();