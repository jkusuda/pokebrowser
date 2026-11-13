package game

import (
	"math"
	"slices"
	"strings"
	"time"

	"github.com/google/uuid"
)

const (
	StatTotalCatches  = "total_catches"
	StatShinyCatches  = "shiny_catches"
	StatTypeCatches   = "type_catches"
	StatEvolutions    = "evolutions"
	StatUniqueSpecies = "unique_species"
)

var TrackedStats = []string{StatTotalCatches, StatShinyCatches, StatTypeCatches, StatEvolutions, StatUniqueSpecies}

type Event struct {
	ID                 uuid.UUID  `json:"id"`
	Name               string     `json:"name"`
	Description        string     `json:"description"`
	StartsAt           time.Time  `json:"startsAt"`
	EndsAt             time.Time  `json:"endsAt"`
	TrackedStat        string     `json:"trackedStat"`
	TypeFilter         *string    `json:"typeFilter"`
	XPMultiplier       float64    `json:"xpMultiplier"`
	CandyMultiplier    float64    `json:"candyMultiplier"`
	ShinyMultiplier    float64    `json:"shinyMultiplier"`
	SpotlightPokedex   *int       `json:"spotlightPokedex"`
	SpotlightRate      *float64   `json:"spotlightRate"`
	BoostedTypes       []string   `json:"boostedTypes"`
	TypeBoost          float64    `json:"typeBoost"`
	BoostedGenerations []int      `json:"boostedGenerations"`
	GenerationBoost    float64    `json:"generationBoost"`
	CommunityGoal      *int       `json:"communityGoal"`
	GoalReachedAt      *time.Time `json:"goalReachedAt"`
	RewardTokenType    *string    `json:"rewardTokenType"`
	RewardPokedex      *int       `json:"rewardPokedex"`
	FinalizedAt        *time.Time `json:"finalizedAt"`
	CreatedAt          time.Time  `json:"createdAt"`
}

func (e Event) LiveAt(t time.Time) bool { return !e.StartsAt.After(t) && e.EndsAt.After(t) }

// Multiplier combines one kind of bonus across live events: the largest value
// that differs from 1 wins, capped at MaxMultiplier.
func Multiplier(live []Event, pick func(Event) float64) float64 {
	m, found := 0.0, false
	for _, e := range live {
		if v := pick(e); v > 0 && v != 1 && (!found || v > m) {
			m, found = v, true
		}
	}
	if !found {
		return 1
	}
	return math.Min(m, MaxMultiplier)
}

func XPMultiplier(e Event) float64    { return e.XPMultiplier }
func CandyMultiplier(e Event) float64 { return e.CandyMultiplier }
func ShinyMultiplier(e Event) float64 { return e.ShinyMultiplier }

func ShinyChance(live []Event) float64 {
	return math.Min(BaseShinyChance*Multiplier(live, ShinyMultiplier), 1)
}

// Scores reports whether a catch or evolution counts toward an event.
// unique_species is handled by the caller, since it depends on history.
func (e Event) Scores(evolve, shiny bool, types []string) bool {
	switch e.TrackedStat {
	case StatTotalCatches:
		return !evolve
	case StatShinyCatches:
		return !evolve && shiny
	case StatTypeCatches:
		return !evolve && e.TypeFilter != nil && slices.Contains(types, *e.TypeFilter)
	case StatEvolutions:
		return evolve
	}
	return false
}

// SortLive orders live events for display: community goals, then spotlights, then the rest.
func SortLive(events []Event) {
	tier := func(e Event) int {
		switch {
		case e.CommunityGoal != nil:
			return 0
		case e.SpotlightPokedex != nil:
			return 1
		}
		return 2
	}
	slices.SortStableFunc(events, func(a, b Event) int { return tier(a) - tier(b) })
}

type EventInput struct {
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	StartsAt           time.Time `json:"startsAt"`
	EndsAt             time.Time `json:"endsAt"`
	TrackedStat        string    `json:"trackedStat"`
	TypeFilter         *string   `json:"typeFilter"`
	XPMultiplier       float64   `json:"xpMultiplier"`
	CandyMultiplier    float64   `json:"candyMultiplier"`
	ShinyMultiplier    float64   `json:"shinyMultiplier"`
	SpotlightPokedex   *int      `json:"spotlightPokedex"`
	SpotlightRate      *float64  `json:"spotlightRate"`
	BoostedTypes       []string  `json:"boostedTypes"`
	TypeBoost          float64   `json:"typeBoost"`
	BoostedGenerations []int     `json:"boostedGenerations"`
	GenerationBoost    float64   `json:"generationBoost"`
	CommunityGoal      *int      `json:"communityGoal"`
	RewardTokenType    *string   `json:"rewardTokenType"`
	RewardPokedex      *int      `json:"rewardPokedex"`
}

// Normalize fills defaults for omitted multipliers and lists.
func (in *EventInput) Normalize() {
	in.Name = strings.TrimSpace(in.Name)
	if in.TypeFilter != nil {
		t := strings.ToLower(*in.TypeFilter)
		in.TypeFilter = &t
	}
	for i, t := range in.BoostedTypes {
		in.BoostedTypes[i] = strings.ToLower(t)
	}
	for _, m := range []*float64{&in.XPMultiplier, &in.CandyMultiplier, &in.ShinyMultiplier, &in.TypeBoost, &in.GenerationBoost} {
		if *m == 0 {
			*m = 1
		}
	}
	if in.BoostedTypes == nil {
		in.BoostedTypes = []string{}
	}
	if in.BoostedGenerations == nil {
		in.BoostedGenerations = []int{}
	}
}

// Validate returns the code of the first broken rule, or "".
func (in EventInput) Validate(c *Catalog) string {
	switch {
	case len([]rune(in.Name)) < 1 || len([]rune(in.Name)) > 60:
		return "invalid_name"
	case len([]rune(in.Description)) > 500:
		return "invalid_description"
	case in.StartsAt.IsZero() || !in.EndsAt.After(in.StartsAt):
		return "invalid_window"
	case !slices.Contains(TrackedStats, in.TrackedStat):
		return "invalid_tracked_stat"
	case (in.TrackedStat == StatTypeCatches) != (in.TypeFilter != nil),
		in.TypeFilter != nil && !IsType(*in.TypeFilter):
		return "invalid_type_filter"
	}

	for _, m := range []float64{in.XPMultiplier, in.CandyMultiplier, in.ShinyMultiplier} {
		if m <= 0 || m > MaxMultiplier {
			return "invalid_bonuses"
		}
	}

	if (in.SpotlightPokedex == nil) != (in.SpotlightRate == nil) {
		return "invalid_spotlight"
	}
	if in.SpotlightPokedex != nil {
		s, ok := c.Get(*in.SpotlightPokedex)
		if !ok || s.Mythical || *in.SpotlightRate <= 0 || *in.SpotlightRate > 0.9 {
			return "invalid_spotlight"
		}
	}

	if len(in.BoostedTypes) > 3 || HasDuplicates(in.BoostedTypes) || !boostOK(in.TypeBoost, len(in.BoostedTypes)) {
		return "invalid_type_boost"
	}
	for _, t := range in.BoostedTypes {
		if !IsType(t) {
			return "invalid_type_boost"
		}
	}

	gens := c.Generations()
	if HasDuplicates(in.BoostedGenerations) || !boostOK(in.GenerationBoost, len(in.BoostedGenerations)) {
		return "invalid_generation_boost"
	}
	for _, g := range in.BoostedGenerations {
		if !slices.Contains(gens, g) {
			return "invalid_generation_boost"
		}
	}

	if in.CommunityGoal != nil && *in.CommunityGoal <= 0 {
		return "invalid_community_goal"
	}
	if (in.CommunityGoal == nil) != (in.RewardTokenType == nil) ||
		in.RewardTokenType != nil && !IsTokenType(*in.RewardTokenType) ||
		(in.RewardTokenType != nil && *in.RewardTokenType == "species") != (in.RewardPokedex != nil) {
		return "invalid_reward"
	}
	if in.RewardPokedex != nil {
		if _, ok := c.Get(*in.RewardPokedex); !ok {
			return "invalid_reward"
		}
	}
	return ""
}

// A boost is 1 exactly when nothing is boosted, and at most 20.
func boostOK(boost float64, n int) bool {
	return boost >= 1 && boost <= 20 && (n == 0) == (boost == 1)
}

func HasDuplicates[T comparable](xs []T) bool {
	seen := map[T]bool{}
	for _, x := range xs {
		if seen[x] {
			return true
		}
		seen[x] = true
	}
	return false
}
