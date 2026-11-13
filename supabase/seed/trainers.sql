-- Local test trainers: ash@local.test (admin) and misty@local.test, friends.
-- Password: pokebrowser-local. Inserting into auth.users fires the signup trigger.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt('pokebrowser-local', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('trainer_name', u.trainer_name), now(), now(),
  '', '', '', ''
from (values
  ('a5a5a5a5-0000-4000-8000-000000000001'::uuid, 'ash@local.test',   'Ash'),
  ('a5a5a5a5-0000-4000-8000-000000000002'::uuid, 'misty@local.test', 'Misty')
) as u(id, email, trainer_name);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select gen_random_uuid(), id, id::text,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users
where email in ('ash@local.test', 'misty@local.test');

update public.users set is_admin = true
where id = 'a5a5a5a5-0000-4000-8000-000000000001';

insert into public.friends (user_id, friend_id, status) values
  ('a5a5a5a5-0000-4000-8000-000000000001', 'a5a5a5a5-0000-4000-8000-000000000002', 'accepted');
