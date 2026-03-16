CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_full_name text;
  v_avatar_url text;
  v_provider text;
BEGIN
  v_email := NEW.email;
  v_provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NULL
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'picture',
    NULL
  );

  INSERT INTO public.profiles (
    user_id,
    email,
    name,
    avatar_url,
    auth_provider,
    auth_providers,
    completed,
    profile_confirmed
  )
  VALUES (
    NEW.id,
    v_email,
    v_full_name,
    v_avatar_url,
    v_provider,
    ARRAY[v_provider],
    false,
    false
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    name = COALESCE(public.profiles.name, EXCLUDED.name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    auth_provider = EXCLUDED.auth_provider,
    auth_providers = CASE
      WHEN public.profiles.auth_providers IS NULL THEN EXCLUDED.auth_providers
      WHEN EXCLUDED.auth_provider = ANY(public.profiles.auth_providers) THEN public.profiles.auth_providers
      ELSE array_append(public.profiles.auth_providers, EXCLUDED.auth_provider)
    END,
    updated_at = now();

  INSERT INTO public.health_history (
    user_id,
    injuries,
    joint_problems,
    conditions,
    limitations,
    completed
  )
  VALUES (
    NEW.id,
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    ARRAY[]::text[],
    false
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();
