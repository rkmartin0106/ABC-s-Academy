-- ============================================================
-- Auto-create a users row when a new auth user signs up,
-- and sync the role into user_metadata so middleware can
-- read it from the JWT without a DB query.
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
declare
  user_role user_role;
begin
  user_role := coalesce((new.raw_user_meta_data->>'role')::user_role, 'student');

  -- Insert into public users table
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    user_role
  );

  -- Write role back into auth user_metadata so the JWT carries it
  -- (allows middleware to check role without a DB round-trip)
  update auth.users
  set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', user_role::text)
  where id = new.id;

  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger to pick up the updated function
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
