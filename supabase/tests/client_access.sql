-- Run in a transaction that is rolled back. Raises on the first failure.
create function pg_temp.denied(role_name text, claims text, stmt text) returns boolean
language plpgsql as $$
begin
  execute format('set local role %I', role_name);
  perform set_config('request.jwt.claims', claims, true);
  begin
    execute stmt;
  exception when insufficient_privilege then
    reset role;
    return true;
  end;
  reset role;
  return false;
end
$$;

do $$
declare
  ash constant text := '{"sub":"a5a5a5a5-0000-4000-8000-000000000001","role":"authenticated"}';
  misty constant text := '{"sub":"a5a5a5a5-0000-4000-8000-000000000002","role":"authenticated"}';
  watched constant text[] := array['users', 'user_settings', 'pokemon', 'pokedex', 'candies',
                                   'achievement_unlocks', 'tokens', 'friends'];
  t text;
  col text;
  n int;
begin
  for t, col in
    select c.relname, (select attname from pg_attribute where attrelid = c.oid and attnum > 0 and not attisdropped order by attnum limit 1)
    from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
  loop
    assert pg_temp.denied('anon', '{}', format('select 1 from public.%I limit 1', t)), format('anon can select %s', t);
    assert pg_temp.denied('anon', '{}', format('delete from public.%I', t)), format('anon can delete %s', t);

    assert pg_temp.denied('authenticated', ash, format('insert into public.%I default values', t)), format('authenticated can insert %s', t);
    assert pg_temp.denied('authenticated', ash, format('update public.%I set %I = %I', t, col, col)), format('authenticated can update %s', t);
    assert pg_temp.denied('authenticated', ash, format('delete from public.%I', t)), format('authenticated can delete %s', t);
    if not t = any(watched) then
      assert pg_temp.denied('authenticated', ash, format('select 1 from public.%I limit 1', t)), format('authenticated can select %s', t);
    end if;
  end loop;

  for t in select proname from pg_proc where pronamespace = 'public'::regnamespace loop
    assert not has_function_privilege('anon', format('public.%I()', t)::regprocedure, 'execute'), format('anon can execute %s', t);
    assert not has_function_privilege('authenticated', format('public.%I()', t)::regprocedure, 'execute'), format('authenticated can execute %s', t);
  end loop;

  -- Realtime read-own: a trainer sees exactly their own rows.
  set local role authenticated;
  perform set_config('request.jwt.claims', ash, true);
  select count(*) into n from public.users;
  assert n = 1, format('Ash sees %s users rows, want 1', n);
  select count(*) into n from public.user_settings where user_id <> 'a5a5a5a5-0000-4000-8000-000000000001';
  assert n = 0, 'Ash sees another trainer''s settings';
  perform set_config('request.jwt.claims', misty, true);
  select count(*) into n from public.friends;
  assert n = 1, format('Misty sees %s friendships, want 1 (her own)', n);
  reset role;

  raise notice 'client access checks passed';
end
$$;
