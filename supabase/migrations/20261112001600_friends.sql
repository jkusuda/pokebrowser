-- One row per pair of trainers, never with yourself. Existing reverse
-- duplicates keep the accepted row, else the oldest.

delete from public.friends where user_id = friend_id;

delete from public.friends f
using (
  select id, row_number() over (
    partition by least(user_id, friend_id), greatest(user_id, friend_id)
    order by (status = 'accepted') desc, created_at, id
  ) as rank
  from public.friends
) ranked
where ranked.id = f.id and ranked.rank > 1;

alter table public.friends
  drop constraint friends_user_id_friend_id_key,
  add constraint friends_not_self check (user_id <> friend_id);

create unique index friends_pair_key
  on public.friends (least(user_id, friend_id), greatest(user_id, friend_id));
