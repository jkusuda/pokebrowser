package game

import (
	"math"
	"math/rand/v2"
	"slices"
)

// RollWild picks a wild species. Live spotlights share one slot (their rates
// summed, capped at 0.9); otherwise each non-mythical species is weighted by
// the product of every live event's type and generation boosts that apply to it.
func RollWild(r *rand.Rand, c *Catalog, live []Event) Species {
	var spots []Event
	share := 0.0
	for _, e := range live {
		if e.SpotlightPokedex != nil {
			spots = append(spots, e)
			share += *e.SpotlightRate
		}
	}
	if share > 0 && r.Float64() < math.Min(share, 0.9) {
		e := pickWeighted(r, spots, func(e Event) float64 { return *e.SpotlightRate })
		s, _ := c.Get(*e.SpotlightPokedex)
		return s
	}

	pool := Filter(c, func(s Species) bool { return !s.Mythical })
	return pickWeighted(r, pool, func(s Species) float64 {
		w := 1.0
		for _, e := range live {
			if overlaps(s.Types, e.BoostedTypes) {
				w *= e.TypeBoost
			}
			if slices.Contains(e.BoostedGenerations, s.Generation) {
				w *= e.GenerationBoost
			}
		}
		return w
	})
}

// RollToken picks the species a token yields, and whether it's shiny.
func RollToken(r *rand.Rand, c *Catalog, live []Event, tokenType string, typeFilter string, species int) (Species, bool, bool) {
	shiny := r.Float64() < ShinyChance(live)
	var pool []Species
	switch tokenType {
	case "legendary":
		pool = Filter(c, func(s Species) bool { return s.Legendary && !s.Mythical })
	case "mythical":
		pool = Filter(c, func(s Species) bool { return s.Mythical })
	case "shiny":
		pool, shiny = Filter(c, func(s Species) bool { return !s.Mythical }), true
	case "type_pick":
		pool = Filter(c, func(s Species) bool { return !s.Mythical && slices.Contains(s.Types, typeFilter) })
	case "species":
		s, ok := c.Get(species)
		return s, shiny, ok
	}
	if len(pool) == 0 {
		return Species{}, false, false
	}
	return pool[r.IntN(len(pool))], shiny, true
}

func Filter(c *Catalog, keep func(Species) bool) []Species {
	var out []Species
	for _, s := range c.All {
		if keep(s) {
			out = append(out, s)
		}
	}
	return out
}

func pickWeighted[T any](r *rand.Rand, items []T, weight func(T) float64) T {
	total := 0.0
	for _, it := range items {
		total += weight(it)
	}
	x := r.Float64() * total
	for _, it := range items {
		if x -= weight(it); x < 0 {
			return it
		}
	}
	return items[len(items)-1]
}

func overlaps(a, b []string) bool {
	for _, x := range a {
		if slices.Contains(b, x) {
			return true
		}
	}
	return false
}
