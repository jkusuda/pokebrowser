package game

import (
	"math/rand/v2"
	"slices"
	"testing"
	"time"
)

func testCatalog() *Catalog {
	return NewCatalog([]Species{
		{ID: 1, Name: "bulbasaur", Types: []string{"grass", "poison"}, FamilyBaseID: 1, Generation: 1},
		{ID: 2, Name: "ivysaur", Types: []string{"grass", "poison"}, FamilyBaseID: 1, Generation: 1},
		{ID: 3, Name: "venusaur", Types: []string{"grass", "poison"}, FamilyBaseID: 1, Generation: 1},
		{ID: 4, Name: "charmander", Types: []string{"fire"}, FamilyBaseID: 4, Generation: 1},
		{ID: 151, Name: "mew", Types: []string{"psychic"}, Legendary: true, Mythical: true, FamilyBaseID: 151, Generation: 1},
		{ID: 152, Name: "chikorita", Types: []string{"grass"}, FamilyBaseID: 152, Generation: 2},
		{ID: 250, Name: "ho-oh", Types: []string{"fire", "flying"}, Legendary: true, FamilyBaseID: 250, Generation: 2},
	}, map[int][]Evolution{1: {{To: 2, Cost: 25}}, 2: {{To: 3, Cost: 100}}})
}

func TestCatchXP(t *testing.T) {
	c := testCatalog()
	get := func(id int) Species { s, _ := c.Get(id); return s }
	cases := []struct {
		id    int
		shiny bool
		want  int
	}{
		{1, false, 100}, // base of a family
		{2, false, 200}, // middle stage
		{3, false, 300}, // final stage
		{4, false, 300}, // no evolutions
		{250, false, 1000},
		{1, true, 2100},
	}
	for _, tc := range cases {
		if got := c.CatchXP(get(tc.id), tc.shiny); got != tc.want {
			t.Errorf("CatchXP(#%d, shiny=%v) = %d, want %d", tc.id, tc.shiny, got, tc.want)
		}
	}
}

func TestEvolution(t *testing.T) {
	c := testCatalog()
	if e, ok := c.Evolution(1, 0); !ok || e.To != 2 || e.Cost != 25 {
		t.Errorf("default evolution = %+v %v", e, ok)
	}
	if _, ok := c.Evolution(1, 3); ok {
		t.Error("evolving 1 straight to 3 should not be allowed")
	}
	if _, ok := c.Evolution(3, 0); ok {
		t.Error("venusaur should not evolve")
	}
}

func TestDisplayName(t *testing.T) {
	for in, want := range map[string]string{"ho-oh": "Ho-Oh", "mr-mime": "Mr. Mime", "bulbasaur": "Bulbasaur", "tapu-koko": "Tapu koko"} {
		if got := DisplayName(in); got != want {
			t.Errorf("DisplayName(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestMultiplier(t *testing.T) {
	ev := func(xp float64) Event { return Event{XPMultiplier: xp} }
	cases := []struct {
		live []Event
		want float64
	}{
		{nil, 1},
		{[]Event{ev(1)}, 1},
		{[]Event{ev(2), ev(3)}, 3},
		{[]Event{ev(1), ev(0.5)}, 0.5},
		{[]Event{ev(500)}, MaxMultiplier},
	}
	for _, tc := range cases {
		if got := Multiplier(tc.live, XPMultiplier); got != tc.want {
			t.Errorf("Multiplier(%v) = %v, want %v", tc.live, got, tc.want)
		}
	}
}

func TestScores(t *testing.T) {
	fire := "fire"
	cases := []struct {
		e             Event
		evolve, shiny bool
		types         []string
		want          bool
	}{
		{Event{TrackedStat: StatTotalCatches}, false, false, nil, true},
		{Event{TrackedStat: StatTotalCatches}, true, false, nil, false},
		{Event{TrackedStat: StatShinyCatches}, false, false, nil, false},
		{Event{TrackedStat: StatShinyCatches}, false, true, nil, true},
		{Event{TrackedStat: StatTypeCatches, TypeFilter: &fire}, false, false, []string{"fire", "flying"}, true},
		{Event{TrackedStat: StatTypeCatches, TypeFilter: &fire}, false, false, []string{"water"}, false},
		{Event{TrackedStat: StatEvolutions}, true, false, nil, true},
		{Event{TrackedStat: StatUniqueSpecies}, false, false, nil, false},
	}
	for i, tc := range cases {
		if got := tc.e.Scores(tc.evolve, tc.shiny, tc.types); got != tc.want {
			t.Errorf("case %d: Scores = %v, want %v", i, got, tc.want)
		}
	}
}

func TestRollWildNeverMythical(t *testing.T) {
	c := testCatalog()
	r := rand.New(rand.NewPCG(1, 2))
	for range 2000 {
		if RollWild(r, c, nil).Mythical {
			t.Fatal("rolled a mythical in the wild")
		}
	}
}

func TestRollWildSpotlightAndBoosts(t *testing.T) {
	c := testCatalog()
	r := rand.New(rand.NewPCG(3, 4))
	spot, rate := 4, 0.5
	live := []Event{{SpotlightPokedex: &spot, SpotlightRate: &rate}}

	hits := 0
	const n = 20000
	for range n {
		if RollWild(r, c, live).ID == 4 {
			hits++
		}
	}
	// 50% spotlight + 1/6 of the remaining uniform rolls.
	if got, want := float64(hits)/n, 0.5+0.5/6; got < want-0.02 || got > want+0.02 {
		t.Errorf("spotlight share = %.3f, want ~%.3f", got, want)
	}

	boosted := []Event{{BoostedTypes: []string{"fire"}, TypeBoost: 5, GenerationBoost: 1}}
	fire := 0
	for range n {
		if slices.Contains(RollWild(r, c, boosted).Types, "fire") {
			fire++
		}
	}
	// Two fire species weighted 5 against four others weighted 1: 10/14.
	if got, want := float64(fire)/n, 10.0/14; got < want-0.02 || got > want+0.02 {
		t.Errorf("boosted fire share = %.3f, want ~%.3f", got, want)
	}
}

func TestRollToken(t *testing.T) {
	c := testCatalog()
	r := rand.New(rand.NewPCG(5, 6))
	for range 200 {
		if s, _, _ := RollToken(r, c, nil, "legendary", "", 0); s.ID != 250 {
			t.Fatalf("legendary token gave #%d", s.ID)
		}
		if s, _, _ := RollToken(r, c, nil, "mythical", "", 0); s.ID != 151 {
			t.Fatalf("mythical token gave #%d", s.ID)
		}
		if _, shiny, _ := RollToken(r, c, nil, "shiny", "", 0); !shiny {
			t.Fatal("shiny token gave a non-shiny")
		}
		if s, _, _ := RollToken(r, c, nil, "type_pick", "fire", 0); !slices.Contains(s.Types, "fire") {
			t.Fatalf("fire token gave #%d", s.ID)
		}
	}
	if s, _, ok := RollToken(r, c, nil, "species", "", 151); !ok || s.ID != 151 {
		t.Error("species token should give exactly that species, mythicals included")
	}
	if _, _, ok := RollToken(r, c, nil, "type_pick", "ice", 0); ok {
		t.Error("empty pool should fail")
	}
}

func TestStreaks(t *testing.T) {
	d := func(day int) time.Time { return time.Date(2026, 10, day, 0, 0, 0, 0, time.UTC) }
	cases := []struct {
		days             []time.Time
		current, longest int
	}{
		{nil, 0, 0},
		{[]time.Time{d(1)}, 1, 1},
		{[]time.Time{d(1), d(2), d(3), d(5)}, 1, 3},
		{[]time.Time{d(1), d(3), d(4)}, 2, 2},
	}
	for _, tc := range cases {
		cur, long := Streaks(tc.days)
		if cur != tc.current || long != tc.longest {
			t.Errorf("Streaks(%v) = %d, %d; want %d, %d", tc.days, cur, long, tc.current, tc.longest)
		}
	}
}

func TestCatchAchievements(t *testing.T) {
	got := CatchAchievements(Progress{StatCatches: 10, StatLevel: 5, StatKanto: 150}, true, false)
	for _, id := range []string{"first_steps", "getting_started", "lucky_color", "level_5"} {
		if !slices.Contains(got, id) {
			t.Errorf("missing %s in %v", id, got)
		}
	}
	if slices.Contains(got, "collector") || slices.Contains(got, "level_10") || slices.Contains(got, "kanto_complete") {
		t.Errorf("unexpected unlocks in %v", got)
	}
	for _, id := range got {
		if _, ok := Achievements[id]; !ok {
			t.Errorf("%s has no reward entry", id)
		}
	}
}

func TestNormalizeHostname(t *testing.T) {
	for in, want := range map[string]string{
		"https://www.Example.com/path?q": "example.com",
		"user@sub.site.org:8080":         "sub.site.org",
		"localhost":                      "localhost",
		"nodot":                          "",
		"-bad.com":                       "",
		"":                               "",
	} {
		if got := NormalizeHostname(in); got != want {
			t.Errorf("NormalizeHostname(%q) = %q, want %q", in, got, want)
		}
	}
	if out, ok := BlockedSites([]string{"a.com", "https://A.com", "b.org"}); !ok || !slices.Equal(out, []string{"a.com", "b.org"}) {
		t.Errorf("BlockedSites = %v %v", out, ok)
	}
	if _, ok := BlockedSites([]string{"a.com", "nope"}); ok {
		t.Error("invalid entry should reject the list")
	}
}

func TestEventValidate(t *testing.T) {
	c := testCatalog()
	base := func() EventInput {
		in := EventInput{Name: "Spring", StartsAt: time.Now(), EndsAt: time.Now().Add(time.Hour), TrackedStat: StatTotalCatches}
		in.Normalize()
		return in
	}
	if code := base().Validate(c); code != "" {
		t.Fatalf("valid input rejected: %s", code)
	}
	mew, rate, goal, species := 151, 0.5, 10, "species"
	cases := map[string]func(*EventInput){
		"invalid_window":           func(in *EventInput) { in.EndsAt = in.StartsAt },
		"invalid_type_filter":      func(in *EventInput) { in.TrackedStat = StatTypeCatches },
		"invalid_bonuses":          func(in *EventInput) { in.XPMultiplier = 101 },
		"invalid_spotlight":        func(in *EventInput) { in.SpotlightPokedex, in.SpotlightRate = &mew, &rate },
		"invalid_type_boost":       func(in *EventInput) { in.BoostedTypes = []string{"fire"} },
		"invalid_generation_boost": func(in *EventInput) { in.BoostedGenerations, in.GenerationBoost = []int{4}, 2 },
		"invalid_reward":           func(in *EventInput) { in.CommunityGoal, in.RewardTokenType = &goal, &species },
	}
	for want, mutate := range cases {
		in := base()
		mutate(&in)
		if got := in.Validate(c); got != want {
			t.Errorf("got %q, want %q", got, want)
		}
	}
}
