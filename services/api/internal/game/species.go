package game

import (
	"slices"
	"strings"
)

type Species struct {
	ID           int
	Name         string // PokéAPI slug, e.g. "mr-mime"
	Types        []string
	Legendary    bool // also true for mythicals
	Mythical     bool
	FamilyBaseID int
	Generation   int
}

type Evolution struct {
	To   int
	Cost int
}

// Catalog is the static species and evolution data, loaded once at startup.
type Catalog struct {
	All        []Species
	byID       map[int]Species
	evolutions map[int][]Evolution
	evolvedTo  map[int]bool
}

func NewCatalog(species []Species, evolutions map[int][]Evolution) *Catalog {
	c := &Catalog{All: species, byID: map[int]Species{}, evolutions: evolutions, evolvedTo: map[int]bool{}}
	for _, s := range species {
		c.byID[s.ID] = s
	}
	for from := range evolutions {
		slices.SortFunc(evolutions[from], func(a, b Evolution) int { return a.To - b.To })
		for _, e := range evolutions[from] {
			c.evolvedTo[e.To] = true
		}
	}
	return c
}

func (c *Catalog) Get(id int) (Species, bool) {
	s, ok := c.byID[id]
	return s, ok
}

// Evolution returns the evolution from a species to target, or the
// lowest-numbered one when target is 0.
func (c *Catalog) Evolution(from, target int) (Evolution, bool) {
	for _, e := range c.evolutions[from] {
		if target == 0 || e.To == target {
			return e, true
		}
	}
	return Evolution{}, false
}

// Generations lists the generations that have species.
func (c *Catalog) Generations() []int {
	var gens []int
	for _, s := range c.All {
		if !slices.Contains(gens, s.Generation) {
			gens = append(gens, s.Generation)
		}
	}
	slices.Sort(gens)
	return gens
}

// CatchXP is the XP for catching a species, before event multipliers.
func (c *Catalog) CatchXP(s Species, shiny bool) int {
	xp := 100
	switch {
	case s.Legendary:
		xp = 1000
	case len(c.evolutions[s.ID]) == 0:
		xp = 300
	case c.evolvedTo[s.ID]:
		xp = 200
	}
	if shiny {
		xp += 2000
	}
	return xp
}

var displayNames = map[string]string{
	"nidoran-f":     "Nidoran♀",
	"nidoran-m":     "Nidoran♂",
	"mr-mime":       "Mr. Mime",
	"farfetchd":     "Farfetch'd",
	"ho-oh":         "Ho-Oh",
	"porygon2":      "Porygon2",
	"deoxys-normal": "Deoxys",
}

// DisplayName turns a species slug into the default nickname shown in game.
func DisplayName(slug string) string {
	if n, ok := displayNames[slug]; ok {
		return n
	}
	if slug == "" {
		return ""
	}
	return strings.ToUpper(slug[:1]) + strings.ReplaceAll(slug[1:], "-", " ")
}
