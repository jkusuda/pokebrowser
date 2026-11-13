package service

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"math/rand/v2"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jkusuda/pokebrowser/services/api/internal/auth"
	"github.com/jkusuda/pokebrowser/services/api/internal/errs"
	"github.com/jkusuda/pokebrowser/services/api/internal/game"
	"github.com/jkusuda/pokebrowser/services/api/internal/store"
)

// These run against the local stack (`supabase db reset` first):
//   TEST_DATABASE_URL   the API role, used by the service
//   TEST_ADMIN_URL      a superuser, used only to create test trainers and set up state
// `make test-db` sets both.

type env struct {
	t     *testing.T
	svc   *Service
	admin *pgx.Conn
	clock time.Time
}

func setup(t *testing.T) *env {
	t.Helper()
	url, adminURL := os.Getenv("TEST_DATABASE_URL"), os.Getenv("TEST_ADMIN_URL")
	if url == "" || adminURL == "" {
		t.Skip("TEST_DATABASE_URL / TEST_ADMIN_URL not set")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(st.Close)
	catalog, err := st.Q().LoadCatalog(ctx)
	if err != nil {
		t.Fatal(err)
	}
	admin, err := pgx.Connect(ctx, adminURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { admin.Close(ctx) })

	e := &env{t: t, admin: admin, clock: time.Now()}
	e.svc = New(st, catalog, slog.New(slog.NewTextHandler(io.Discard, nil)))
	e.svc.now = func() time.Time { return e.clock }
	return e
}

func (e *env) advance(d time.Duration) { e.clock = e.clock.Add(d) }

// alwaysHit makes every random roll return 0: encounters always appear,
// are shiny, and pick the first species in a weighted pool.
type zeroSource struct{}

func (zeroSource) Uint64() uint64 { return 0 }

func (e *env) alwaysHit() { e.svc.rand = rand.New(zeroSource{}) }

func (e *env) exec(sql string, args ...any) {
	e.t.Helper()
	if _, err := e.admin.Exec(context.Background(), sql, args...); err != nil {
		e.t.Fatalf("%s: %v", sql, err)
	}
}

// newTrainer signs up a trainer through auth.users, so the signup trigger
// creates their rows exactly as in production.
func (e *env) newTrainer(name string) uuid.UUID {
	e.t.Helper()
	id := uuid.New()
	e.exec(`insert into auth.users (instance_id, id, aud, role, email, raw_user_meta_data, created_at, updated_at)
		values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
			jsonb_build_object('trainer_name', $3::text), now(), now())`, id, id.String()+"@test.local", name)
	e.t.Cleanup(func() { e.admin.Exec(context.Background(), `delete from auth.users where id = $1`, id) })
	return id
}

func (e *env) friendCode(id uuid.UUID) string {
	var code string
	if err := e.admin.QueryRow(context.Background(), `select friend_code from users where id = $1`, id).Scan(&code); err != nil {
		e.t.Fatal(err)
	}
	return code
}

func (e *env) count(sql string, args ...any) int {
	e.t.Helper()
	var n int
	if err := e.admin.QueryRow(context.Background(), sql, args...).Scan(&n); err != nil {
		e.t.Fatalf("%s: %v", sql, err)
	}
	return n
}

// encounter gives a trainer a pending encounter without rolling.
func (e *env) encounter(userID uuid.UUID, species int) uuid.UUID {
	nonce := uuid.New()
	e.exec(`insert into pending_encounters (user_id, nonce, pokedex_number, is_shiny, created_at)
		values ($1, $2, $3, false, $4)
		on conflict (user_id) do update set nonce = excluded.nonce, pokedex_number = excluded.pokedex_number,
			created_at = excluded.created_at`, userID, nonce, species, e.clock)
	return nonce
}

func (e *env) catch(userID uuid.UUID, species int) CatchResult {
	e.t.Helper()
	e.advance(2 * time.Second)
	res, err := e.svc.Catch(context.Background(), userID, e.encounter(userID, species), "example.com")
	if err != nil {
		e.t.Fatalf("catch #%d: %v", species, err)
	}
	return res
}

func wantCode(t *testing.T, err error, code string) {
	t.Helper()
	var apiErr *errs.Error
	if !errors.As(err, &apiErr) || apiErr.Code != code {
		t.Fatalf("want error %q, got %v", code, err)
	}
}

func contains(list []string, s string) bool {
	for _, x := range list {
		if x == s {
			return true
		}
	}
	return false
}

func TestCatch(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash := e.newTrainer("Ash")

	nonce := e.encounter(ash, 1)
	res, err := e.svc.Catch(ctx, ash, nonce, "Example.COM")
	if err != nil {
		t.Fatal(err)
	}
	if res.PokedexNumber != 1 || !res.IsNewSpecies || !contains(res.NewAchievements, "first_steps") {
		t.Errorf("result = %+v", res)
	}

	me, err := e.svc.Me(ctx, auth.Identity{UserID: ash})
	if err != nil {
		t.Fatal(err)
	}
	if len(me.Pokemon) != 1 || *me.Pokemon[0].Nickname != "Bulbasaur" || *me.Pokemon[0].CaughtOn != "example.com" {
		t.Errorf("pokemon = %+v", me.Pokemon)
	}
	if me.Profile.XP != 100 || len(me.Candies) != 1 || me.Candies[0].Count != game.CatchCandy {
		t.Errorf("xp = %d, candies = %+v", me.Profile.XP, me.Candies)
	}
	if me.Stats.TotalCatches != 1 || me.Stats.CurrentStreak != 1 || len(me.Stats.Sites) != 1 ||
		!contains(me.Stats.TypesCaught, "grass") || !contains(me.Stats.TypesCaught, "poison") {
		t.Errorf("stats = %+v", me.Stats)
	}

	list, err := e.svc.Achievements(ctx, ash)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string][2]int{"first_steps": {1, 1}, "getting_started": {1, 10}, "kanto_complete": {1, 151}, "lucky_color": {0, 1}}
	for _, a := range list {
		if w, ok := want[a.ID]; ok && (a.Progress != w[0] || a.Goal != w[1]) {
			t.Errorf("%s: progress %d/%d, want %d/%d", a.ID, a.Progress, a.Goal, w[0], w[1])
		}
	}

	// Retrying the same catch returns the same Pokémon instead of failing or duplicating.
	again, err := e.svc.Catch(ctx, ash, nonce, "example.com")
	if err != nil || again.PokemonID != res.PokemonID {
		t.Errorf("retry = %+v, %v", again, err)
	}
	_, err = e.svc.Catch(ctx, ash, uuid.New(), "")
	wantCode(t, err, "no_pending_encounter")
}

func TestCatchLimits(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash := e.newTrainer("Ash")
	e.catch(ash, 4)

	_, err := e.svc.Catch(ctx, ash, e.encounter(ash, 7), "")
	wantCode(t, err, "rate_limited")

	e.advance(2 * time.Second)
	e.exec(`update user_limits set catches_today = 500, catches_today_date = $2 where user_id = $1`, ash, game.UTCDay(e.clock))
	_, err = e.svc.Catch(ctx, ash, e.encounter(ash, 7), "")
	wantCode(t, err, "daily_limit_reached")
	e.exec(`update user_limits set catches_today = 0 where user_id = $1`, ash)

	e.exec(`update users set catch_limit = 1 where id = $1`, ash)
	_, err = e.svc.Catch(ctx, ash, e.encounter(ash, 7), "")
	wantCode(t, err, "catch_limit_reached")
	e.exec(`update users set catch_limit = 200 where id = $1`, ash)

	nonce := e.encounter(ash, 7)
	e.advance(game.EncounterTTL)
	_, err = e.svc.Catch(ctx, ash, nonce, "")
	wantCode(t, err, "encounter_expired")
}

func TestConcurrentCatchOfOneEncounter(t *testing.T) {
	e := setup(t)
	ash := e.newTrainer("Ash")
	nonce := e.encounter(ash, 25)

	var wg sync.WaitGroup
	ids := make([]uuid.UUID, 5)
	for i := range ids {
		wg.Add(1)
		go func() {
			defer wg.Done()
			res, err := e.svc.Catch(context.Background(), ash, nonce, "")
			if err != nil {
				t.Errorf("catch %d: %v", i, err)
			}
			ids[i] = res.PokemonID
		}()
	}
	wg.Wait()
	if n := e.count(`select count(*) from pokemon where user_id = $1`, ash); n != 1 {
		t.Fatalf("%d Pokémon from one encounter, want 1", n)
	}
	for _, id := range ids {
		if id != ids[0] {
			t.Errorf("callers saw different Pokémon: %v", ids)
		}
	}
}

func TestRoll(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash := e.newTrainer("Ash")
	e.alwaysHit()

	first, err := e.svc.Roll(ctx, ash)
	if err != nil || first.Encounter == nil || first.RetryAfterMs != 0 {
		t.Fatalf("first roll = %+v, %v", first, err)
	}
	if first.CatchLimit != 200 || first.Settings.Theme != "green" {
		t.Errorf("box status = %+v", first)
	}

	sticky, err := e.svc.Roll(ctx, ash)
	if err != nil || sticky.Encounter == nil || sticky.Encounter.Nonce != first.Encounter.Nonce {
		t.Fatalf("an unexpired encounter should be returned again: %+v", sticky)
	}

	if _, err := e.svc.Catch(ctx, ash, first.Encounter.Nonce, ""); err != nil {
		t.Fatal(err)
	}
	cooling, err := e.svc.Roll(ctx, ash)
	if err != nil || cooling.Encounter != nil || cooling.RetryAfterMs <= 0 {
		t.Fatalf("roll during cooldown = %+v", cooling)
	}

	e.advance(game.RollCooldown)
	next, err := e.svc.Roll(ctx, ash)
	if err != nil || next.Encounter == nil || next.Encounter.Nonce == first.Encounter.Nonce {
		t.Fatalf("roll after cooldown = %+v", next)
	}
	if sp, _ := e.svc.catalog.Get(next.Encounter.PokedexNumber); sp.Mythical {
		t.Error("rolled a mythical")
	}
}

func TestTokensAndClaims(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash := e.newTrainer("Ash")

	if err := e.svc.GrantToken(ctx, ash, GrantTokenInput{TokenType: "legendary"}); err != nil {
		t.Fatal(err)
	}
	me, _ := e.svc.Me(ctx, auth.Identity{UserID: ash})
	tokenID := me.Tokens[0].ID
	res, err := e.svc.OpenToken(ctx, ash, tokenID)
	if err != nil {
		t.Fatal(err)
	}
	if sp, _ := e.svc.catalog.Get(res.PokedexNumber); !sp.Legendary || sp.Mythical {
		t.Errorf("legendary token gave #%d", res.PokedexNumber)
	}
	_, err = e.svc.OpenToken(ctx, ash, tokenID)
	wantCode(t, err, "already_used")

	// The token catch earned first_steps; claiming it grants XP and storage once.
	claim, err := e.svc.ClaimAchievement(ctx, ash, "first_steps")
	if err != nil || claim.XPGranted != 500 || claim.StorageGranted != 50 {
		t.Fatalf("claim = %+v, %v", claim, err)
	}
	_, err = e.svc.ClaimAchievement(ctx, ash, "first_steps")
	wantCode(t, err, "already_claimed")
	_, err = e.svc.ClaimAchievement(ctx, ash, "collector")
	wantCode(t, err, "achievement_not_found")
	_, err = e.svc.ClaimAchievement(ctx, ash, "nope")
	wantCode(t, err, "unknown_achievement")

	// 1000 (legendary) + 500 XP is level 2: one banked level-up candy.
	me, _ = e.svc.Me(ctx, auth.Identity{UserID: ash})
	if me.Profile.CatchLimit != 250 || me.Profile.Level != 2 || me.Profile.UnclaimedCandyLevels != 1 ||
		me.Profile.LevelXP != 1000 || me.Profile.NextLevelXP != 3000 {
		t.Fatalf("profile = %+v", me.Profile)
	}
	if err := e.svc.ClaimCandy(ctx, ash, res.PokedexNumber); err != nil {
		t.Fatal(err)
	}
	wantCode(t, e.svc.ClaimCandy(ctx, ash, res.PokedexNumber), "no_pending_candy")
	wantCode(t, e.svc.ClaimCandy(ctx, ash, 1), "species_not_unlocked")

	if err := e.svc.GrantToken(ctx, ash, GrantTokenInput{TokenType: "type_pick"}); err != nil {
		t.Fatal(err)
	}
	me, _ = e.svc.Me(ctx, auth.Identity{UserID: ash})
	pick := me.Tokens[0].ID
	_, err = e.svc.OpenToken(ctx, ash, pick)
	wantCode(t, err, "type_not_selected")
	if err := e.svc.SetTokenType(ctx, ash, pick, "water"); err != nil {
		t.Fatal(err)
	}
	res, err = e.svc.OpenToken(ctx, ash, pick)
	if sp, _ := e.svc.catalog.Get(res.PokedexNumber); err != nil || !contains(sp.Types, "water") {
		t.Errorf("water token gave #%d, %v", res.PokedexNumber, err)
	}
}

func TestEvolve(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash := e.newTrainer("Ash")
	bulba := e.catch(ash, 1)

	_, err := e.svc.Evolve(ctx, ash, bulba.PokemonID, 0)
	wantCode(t, err, "insufficient_candy")

	e.exec(`update candies set count = 100 where user_id = $1 and family_base_id = 1`, ash)
	res, err := e.svc.Evolve(ctx, ash, bulba.PokemonID, 0)
	if err != nil || res.Pokemon.PokedexNumber != 2 || *res.Pokemon.Nickname != "Ivysaur" || !res.IsNewSpecies {
		t.Fatalf("evolve = %+v, %v", res, err)
	}
	if n := e.count(`select count from candies where user_id = $1 and family_base_id = 1`, ash); n != 75 {
		t.Errorf("candy left = %d, want 75", n)
	}

	if _, err := e.svc.Rename(ctx, ash, bulba.PokemonID, "Leafy"); err != nil {
		t.Fatal(err)
	}
	e.exec(`update candies set count = 100 where user_id = $1 and family_base_id = 1`, ash)
	res, err = e.svc.Evolve(ctx, ash, bulba.PokemonID, 0)
	if err != nil || *res.Pokemon.Nickname != "Leafy" {
		t.Errorf("custom nickname changed to %q", *res.Pokemon.Nickname)
	}
	_, err = e.svc.Evolve(ctx, ash, bulba.PokemonID, 0)
	wantCode(t, err, "not_evolvable")

	misty := e.newTrainer("Misty")
	_, err = e.svc.Evolve(ctx, misty, bulba.PokemonID, 0)
	wantCode(t, err, "not_found")

	unlocked, err := e.svc.Release(ctx, ash, bulba.PokemonID)
	if err != nil || !contains(unlocked, "letting_go") {
		t.Errorf("release = %v, %v", unlocked, err)
	}
}

func TestProfileAndSettings(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash := e.newTrainer("Ash")
	p := e.catch(ash, 4)

	name := "Ash K"
	unlocked, err := e.svc.UpdateProfile(ctx, ash, ProfileInput{
		TrainerName:       &name,
		FavoritePokemonID: Nullable[uuid.UUID]{Set: true, Value: &p.PokemonID},
	})
	if err != nil || !contains(unlocked, "identity_crisis") {
		t.Fatalf("update = %v, %v", unlocked, err)
	}
	me, _ := e.svc.Me(ctx, auth.Identity{UserID: ash})
	if me.Profile.TrainerName != "Ash K" || me.Buddy == nil || me.Buddy.ID != p.PokemonID {
		t.Errorf("profile = %+v, buddy = %+v", me.Profile, me.Buddy)
	}

	misty := e.newTrainer("Misty")
	_, err = e.svc.UpdateProfile(ctx, misty, ProfileInput{FavoritePokemonID: Nullable[uuid.UUID]{Set: true, Value: &p.PokemonID}})
	wantCode(t, err, "not_found")

	theme := "blue"
	st, err := e.svc.UpdateSettings(ctx, ash, SettingsInput{Theme: &theme, BlockedSites: []string{"https://www.Bank.com/login"}})
	if err != nil || st.Theme != "blue" || len(st.BlockedSites) != 1 || st.BlockedSites[0] != "bank.com" {
		t.Errorf("settings = %+v, %v", st, err)
	}

	wantCode(t, e.svc.SetBadges(ctx, ash, []string{"first_steps", "collector"}), "badge_not_unlocked")
	if err := e.svc.SetBadges(ctx, ash, []string{"first_steps"}); err != nil {
		t.Error(err)
	}
}

func TestFriends(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash, misty, brock := e.newTrainer("Ash"), e.newTrainer("Misty"), e.newTrainer("Brock")

	id, err := e.svc.AddFriend(ctx, ash, e.friendCode(misty))
	if err != nil {
		t.Fatal(err)
	}
	_, err = e.svc.AddFriend(ctx, misty, e.friendCode(ash))
	wantCode(t, err, "already_friends")
	_, err = e.svc.AddFriend(ctx, ash, e.friendCode(ash))
	wantCode(t, err, "cannot_add_self")

	_, err = e.svc.AcceptFriend(ctx, ash, id)
	wantCode(t, err, "not_authorized")
	unlocked, err := e.svc.AcceptFriend(ctx, misty, id)
	if err != nil || !contains(unlocked, "friendly") {
		t.Fatalf("accept = %v, %v", unlocked, err)
	}
	if n := e.count(`select count(*) from achievement_unlocks where user_id = $1 and achievement_id = 'friendly'`, ash); n != 1 {
		t.Error("the requester should also get friendly")
	}

	if _, err := e.svc.FriendProfile(ctx, ash, e.friendCode(misty)); err != nil {
		t.Errorf("friend profile: %v", err)
	}
	_, err = e.svc.FriendProfile(ctx, brock, e.friendCode(misty))
	wantCode(t, err, "not_authorized")

	wantCode(t, e.svc.RemoveFriend(ctx, brock, id), "not_found")
	if err := e.svc.RemoveFriend(ctx, ash, id); err != nil {
		t.Error(err)
	}
}

func TestLeaderboardHidesPrivateStrangers(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash, gary := e.newTrainer("Ash"), e.newTrainer("Gary")
	e.exec(`update user_stats set total_catches = 1000000 where user_id = $1`, gary)
	e.exec(`update users set is_private = true where id = $1`, gary)

	b, err := e.svc.Leaderboard(ctx, ash, "catches", "global")
	if err != nil {
		t.Fatal(err)
	}
	top := b.Top[0]
	if top.Value != 1000000 || top.ID != nil || top.TrainerName != nil || !top.IsPrivate {
		t.Errorf("private stranger shown as %+v", top)
	}
	if b.Me == nil || !b.Me.IsMe || *b.Me.TrainerName != "Ash" {
		t.Errorf("me = %+v", b.Me)
	}

	friends, err := e.svc.Leaderboard(ctx, ash, "sites", "friends")
	if err != nil || len(friends.Top) != 1 || !friends.Top[0].IsMe {
		t.Errorf("friends board = %+v, %v", friends, err)
	}
	e.exec(`delete from user_stats where user_id = $1`, gary)
}

func TestCommunityEvent(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash, misty := e.newTrainer("Ash"), e.newTrainer("Misty")

	goal, reward := 2, "legendary"
	id, err := e.svc.CreateEvent(ctx, game.EventInput{
		Name: "Test drive", StartsAt: e.clock.Add(-time.Hour), EndsAt: e.clock.Add(time.Hour),
		TrackedStat: game.StatTotalCatches, CommunityGoal: &goal, RewardTokenType: &reward,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { e.svc.DeleteEvent(ctx, id) })

	e.catch(ash, 1)
	e.catch(ash, 4)
	e.catch(misty, 7)

	for _, u := range []uuid.UUID{ash, misty} {
		if n := e.count(`select count(*) from tokens where user_id = $1 and event_id = $2`, u, id); n != 1 {
			t.Errorf("trainer got %d reward tokens, want 1", n)
		}
	}

	ev, err := e.svc.Events(ctx, ash)
	if err != nil {
		t.Fatal(err)
	}
	for _, live := range ev.Live {
		if live.ID == id && (*live.CommunityProgress != 3 || *live.MyProgress != 2 || live.GoalReachedAt == nil) {
			t.Errorf("live event = %+v", live)
		}
	}

	b, err := e.svc.EventLeaderboard(ctx, misty, id)
	if err != nil || len(b.Top) != 2 || b.Top[0].Value != 2 || b.Me.Rank != 2 {
		t.Fatalf("event board = %+v, %v", b, err)
	}

	e.exec(`update events set starts_at = now() - interval '2 hours', ends_at = now() - interval '1 minute' where id = $1`, id)
	e.clock = time.Now()
	if _, err := e.svc.FinalizeEndedEvents(ctx); err != nil {
		t.Fatal(err)
	}
	for _, u := range []uuid.UUID{ash, misty} {
		if n := e.count(`select count(*) from achievement_unlocks where user_id = $1 and achievement_id = 'event_champion'`, u); n != 1 {
			t.Error("top-3 trainers should get event_champion")
		}
	}
}

func TestUniqueSpeciesEvent(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	ash := e.newTrainer("Ash")
	id, err := e.svc.CreateEvent(ctx, game.EventInput{
		Name: "Dex dash", StartsAt: e.clock.Add(-time.Hour), EndsAt: e.clock.Add(time.Hour),
		TrackedStat: game.StatUniqueSpecies,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { e.svc.DeleteEvent(ctx, id) })

	e.catch(ash, 1)
	e.catch(ash, 1)
	e.catch(ash, 4)
	if n := e.count(`select count(*) from event_species where event_id = $1 and user_id = $2`, id, ash); n != 2 {
		t.Errorf("unique species = %d, want 2", n)
	}
}

func TestAdminValidation(t *testing.T) {
	e := setup(t)
	ctx := context.Background()
	_, err := e.svc.CreateEvent(ctx, game.EventInput{Name: "x", StartsAt: e.clock, EndsAt: e.clock, TrackedStat: game.StatTotalCatches})
	wantCode(t, err, "invalid_window")
	_, _, err = e.svc.AddXP(ctx, e.newTrainer("Ash"), 0)
	wantCode(t, err, "invalid_amount")
	wantCode(t, e.svc.GrantToken(ctx, uuid.New(), GrantTokenInput{TokenType: "species"}), "invalid_pokedex_number")
}
