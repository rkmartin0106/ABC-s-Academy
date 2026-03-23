-- ============================================================
-- Auto-create a users row when a new auth user signs up
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger fires after every new signup in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
