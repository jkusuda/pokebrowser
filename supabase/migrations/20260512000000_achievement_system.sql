-- ============================================================
-- Achievement System Migration
-- ============================================================
-- New tables: user_stats, achievement_unlocks, tokens
-- New column: users.unclaimed_candy_levels
-- New trigger: trg_level_up_candy
-- New RPCs: update_catch_stats, check_action_achievements
-- ============================================================

-- ── 1. New column on users ───────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS unclaimed_candy_levels int NOT NULL DEFAULT 0;

-- ── 2. user_stats table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_stats (
  user_id              uuid    PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_catches        int     NOT NULL DEFAULT 0,
  caught_websites      text[]  NOT NULL DEFAULT '{}',
  types_caught         text[]  NOT NULL DEFAULT '{}',
  current_streak       int     NOT NULL DEFAULT 0,
  longest_streak       int     NOT NULL DEFAULT 0,
  last_catch_date      date,
  total_releases       int     NOT NULL DEFAULT 0,
  has_nicknamed        boolean NOT NULL DEFAULT false,
  trainer_name_changed boolean NOT NULL DEFAULT false,
  avatar_changed       boolean NOT NULL DEFAULT false,
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

-- ── 3. achievement_unlocks table ─────────────────────────────
CREATE TABLE IF NOT EXISTS achievement_unlocks (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id text        NOT NULL,
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  claimed_at     timestamptz,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_unlocks_user
  ON achievement_unlocks(user_id);

ALTER TABLE achievement_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_achievement_unlocks"
  ON achievement_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_achievement_unlocks"
  ON achievement_unlocks FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 4. tokens table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_type   text        NOT NULL CHECK (token_type IN ('legendary','mythical','type_pick','shiny')),
  type_filter  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  used_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tokens_user_unused
  ON tokens(user_id) WHERE used_at IS NULL;

ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_tokens"
  ON tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_tokens"
  ON tokens FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 5. Level-up candy trigger ─────────────────────────────────
CREATE OR REPLACE FUNCTION fn_level_up_candy()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.level > OLD.level THEN
    NEW.unclaimed_candy_levels := NEW.unclaimed_candy_levels + (NEW.level - OLD.level);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_level_up_candy ON users;
CREATE TRIGGER trg_level_up_candy
  BEFORE UPDATE OF level ON users
  FOR EACH ROW
  EXECUTE FUNCTION fn_level_up_candy();

-- ── 6. Helper: try to unlock a single achievement ────────────
-- Returns the achievement_id in an array if newly unlocked, else '{}'.
CREATE OR REPLACE FUNCTION _try_unlock_achievement(
  p_user_id        uuid,
  p_achievement_id text,
  p_condition      boolean
) RETURNS text[]
LANGUAGE plpgsql AS $$
DECLARE
  v_count int;
BEGIN
  IF NOT p_condition THEN
    RETURN '{}';
  END IF;

  INSERT INTO achievement_unlocks (user_id, achievement_id)
  VALUES (p_user_id, p_achievement_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RETURN ARRAY[p_achievement_id];
  ELSE
    RETURN '{}';
  END IF;
END;
$$;

-- ── 7. RPC: update_catch_stats ────────────────────────────────
-- Called from extension background.ts after a successful perform_catch.
-- Updates user_stats counters and checks/unlocks all catch-triggered achievements.
-- Returns array of newly unlocked achievement_ids.
CREATE OR REPLACE FUNCTION update_catch_stats(
  p_is_shiny      boolean,
  p_is_legendary  boolean,
  p_types         text[],
  p_caught_on     text
) RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id        uuid;
  v_current_streak int;
  v_longest_streak int;
  v_last_date      date;
  v_total_catches  int;
  v_websites       text[];
  v_types          text[];
  v_unique_sites   int;
  v_types_count    int;
  v_level          int;
  v_pokedex_count  int;
  v_shiny_dex      int;
  v_newly_unlocked text[] := '{}';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure user_stats row exists
  INSERT INTO user_stats (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock and read current stats
  SELECT
    current_streak, longest_streak, last_catch_date,
    total_catches, caught_websites, types_caught
  INTO
    v_current_streak, v_longest_streak, v_last_date,
    v_total_catches, v_websites, v_types
  FROM user_stats
  WHERE user_id = v_user_id
  FOR UPDATE;

  -- ── Streak update ──────────────────────────────────────────
  IF v_last_date IS NULL THEN
    -- First catch ever
    v_current_streak := 1;
    v_longest_streak := 1;
    v_last_date      := CURRENT_DATE;
  ELSIF v_last_date = CURRENT_DATE THEN
    -- Already caught today — no streak change
    NULL;
  ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    v_last_date := CURRENT_DATE;
  ELSE
    -- Streak broken
    v_current_streak := 1;
    v_last_date      := CURRENT_DATE;
  END IF;

  -- ── Increment total_catches ────────────────────────────────
  v_total_catches := v_total_catches + 1;

  -- ── Accumulate unique websites ─────────────────────────────
  IF p_caught_on IS NOT NULL AND NOT (p_caught_on = ANY(v_websites)) THEN
    v_websites := array_append(v_websites, p_caught_on);
  END IF;

  -- ── Accumulate types caught ────────────────────────────────
  IF p_types IS NOT NULL AND array_length(p_types, 1) > 0 THEN
    SELECT array_agg(DISTINCT elem) INTO v_types
    FROM (
      SELECT unnest(v_types) AS elem
      UNION
      SELECT unnest(p_types) AS elem
    ) sub;
  END IF;

  -- ── Persist updated stats ──────────────────────────────────
  UPDATE user_stats SET
    total_catches  = v_total_catches,
    caught_websites = v_websites,
    types_caught   = v_types,
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_catch_date = v_last_date,
    updated_at     = now()
  WHERE user_id = v_user_id;

  -- ── Read derived values needed for achievement checks ──────
  SELECT level INTO v_level FROM users WHERE id = v_user_id;

  SELECT COUNT(*) INTO v_pokedex_count
  FROM pokedex WHERE user_id = v_user_id;

  SELECT COUNT(DISTINCT pokedex_number) INTO v_shiny_dex
  FROM pokemon WHERE user_id = v_user_id AND is_shiny = true;

  v_unique_sites := COALESCE(array_length(v_websites, 1), 0);
  v_types_count  := COALESCE(array_length(v_types, 1), 0);

  -- ── Check and unlock achievements ─────────────────────────

  -- Catch count
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'first_steps',      v_total_catches >= 1);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'getting_started',  v_total_catches >= 10);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'collector',        v_total_catches >= 100);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'master_collector', v_total_catches >= 1000);

  -- Unique websites
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'explorer',   v_unique_sites >= 10);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'web_surfer', v_unique_sites >= 100);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'netizen',    v_unique_sites >= 1000);

  -- Shiny
  IF p_is_shiny THEN
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'lucky_color', true);
  END IF;

  -- Legendary
  IF p_is_legendary THEN
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'legendary_encounter', true);
  END IF;

  -- Pokedex complete (all 151)
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'gotta_catch_em_all', v_pokedex_count >= 151);

  -- Shiny dex complete (all 151 distinct shiny species)
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'shiny_hunter', v_shiny_dex >= 151);

  -- Type coverage (17 distinct Gen 1 types)
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'just_my_type', v_types_count >= 17);

  -- Streak
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'dedicated',        v_current_streak >= 7);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'love_of_the_game', v_current_streak >= 30);

  -- Level milestones
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'level_5',  v_level >= 5);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'level_10', v_level >= 10);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'level_20', v_level >= 20);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'level_30', v_level >= 30);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'level_40', v_level >= 40);
  v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'level_50', v_level >= 50);

  RETURN v_newly_unlocked;
END;
$$;

-- ── 8. RPC: increment_catch_limit ────────────────────────────
-- Atomically increases a user's catch_limit. Called on achievement claim.
CREATE OR REPLACE FUNCTION increment_catch_limit(
  p_user_id uuid,
  p_amount  int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE users SET catch_limit = catch_limit + p_amount WHERE id = p_user_id;
END;
$$;

-- ── 9. RPC: increment_candy ──────────────────────────────────
-- Atomically adds candies to a family, creating the row if it doesn't exist.
CREATE OR REPLACE FUNCTION increment_candy(
  p_user_id       uuid,
  p_pokedex_number int,
  p_amount        int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO candies (user_id, pokedex_number, count)
  VALUES (p_user_id, p_pokedex_number, p_amount)
  ON CONFLICT (user_id, pokedex_number)
  DO UPDATE SET count = candies.count + p_amount;
END;
$$;

-- ── 10. RPC: check_action_achievements ───────────────────────
-- Called from Next.js API routes after non-catch user actions.
-- Updates relevant stat flags and checks/unlocks the matching achievements.
-- Returns array of newly unlocked achievement_ids.
CREATE OR REPLACE FUNCTION check_action_achievements(
  p_trigger text  -- 'release'|'nickname'|'friend_accept'|'trainer_name_change'|'avatar_change'
) RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id        uuid;
  v_newly_unlocked text[] := '{}';
  v_friend_count   int;
  v_total_releases int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure user_stats row exists
  INSERT INTO user_stats (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  IF p_trigger = 'release' THEN
    UPDATE user_stats
    SET total_releases = total_releases + 1, updated_at = now()
    WHERE user_id = v_user_id
    RETURNING total_releases INTO v_total_releases;
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'letting_go', v_total_releases >= 1);

  ELSIF p_trigger = 'nickname' THEN
    UPDATE user_stats
    SET has_nicknamed = true, updated_at = now()
    WHERE user_id = v_user_id;

    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'that_sounds_better', true);

  ELSIF p_trigger = 'friend_accept' THEN
    SELECT COUNT(*) INTO v_friend_count
    FROM friends
    WHERE (user_id = v_user_id OR friend_id = v_user_id)
      AND status = 'accepted';

    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'friendly',        v_friend_count >= 1);
    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'social_butterfly', v_friend_count >= 10);

  ELSIF p_trigger = 'trainer_name_change' THEN
    UPDATE user_stats
    SET trainer_name_changed = true, updated_at = now()
    WHERE user_id = v_user_id;

    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'identity_crisis', true);

  ELSIF p_trigger = 'avatar_change' THEN
    UPDATE user_stats
    SET avatar_changed = true, updated_at = now()
    WHERE user_id = v_user_id;

    v_newly_unlocked := v_newly_unlocked || _try_unlock_achievement(v_user_id, 'new_look', true);

  END IF;

  RETURN v_newly_unlocked;
END;
$$;
