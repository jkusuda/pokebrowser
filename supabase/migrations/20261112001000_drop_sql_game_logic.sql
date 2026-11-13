-- Game rules move to the Go API. The original functions remain readable in the
-- baseline migration.

select cron.unschedule('finalize-ended-events');

drop trigger trg_level_up_candy on public.users;

drop function public._catch_pokemon(uuid, integer, boolean, integer, text, text, boolean);
drop function public._event_bonus_multiplier(text);
drop function public._event_bonuses_valid(jsonb);
drop function public._finalize_ended_events();
drop function public._grant_event_reward(public.events, uuid);
drop function public._maybe_complete_community_goal(uuid);
drop function public._pokemon_display_name(text);
drop function public._record_event_progress(uuid, text, boolean, text[], integer);
drop function public._roll_wild_species();
drop function public._try_unlock_achievement(uuid, text, boolean);
drop function public._update_catch_stats(uuid, boolean, boolean, text[], text);
drop function public._validate_event_modifiers(integer, numeric, text[], numeric, integer[], numeric, integer, text, integer);
drop function public.check_action_achievements(text, uuid);
drop function public.claim_achievement(text);
drop function public.claim_candy_reward(integer);
drop function public.dev_add_xp(integer);
drop function public.dev_create_event(text, text, timestamptz, timestamptz, text, text, jsonb, integer, numeric, text[], numeric, integer, text, integer, integer[], numeric);
drop function public.dev_delete_event(uuid);
drop function public.dev_grant_token(text, text, integer);
drop function public.dev_unlock_achievement(text);
drop function public.dev_update_event(uuid, text, text, timestamptz, timestamptz, text, text, jsonb, integer, numeric, text[], numeric, integer, text, integer, integer[], numeric);
drop function public.evolve_pokemon(uuid, integer);
drop function public.find_user_id_by_friend_code(text);
drop function public.fn_level_up_candy();
drop function public.get_event_leaderboard(uuid, integer);
drop function public.get_friend_profile(text);
drop function public.get_leaderboard(text, integer, boolean);
drop function public.perform_catch(uuid, text);
drop function public.redeem_token(uuid);
drop function public.roll_encounter(integer);
drop function public.set_displayed_badges(text[]);

drop table public.candies_pre_gen2_backup;
