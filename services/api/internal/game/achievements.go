package game

import "slices"

type Reward struct {
	Storage int    `json:"storage"`
	Token   string `json:"token,omitempty"`
	XP      int    `json:"xp"`
}

// Stat is a trainer counter an achievement is measured against.
type Stat string

const (
	StatCatches    Stat = "catches"
	StatSites      Stat = "sites"
	StatDex        Stat = "dex"
	StatKanto      Stat = "kanto"
	StatJohto      Stat = "johto"
	StatHoenn      Stat = "hoenn"
	StatShinyKanto Stat = "shiny_kanto"
	StatTypes      Stat = "types"
	StatStreak     Stat = "streak"
	StatLevel      Stat = "level"
	StatFriends    Stat = "friends"
)

// Progress holds the current value of each stat that is known.
type Progress map[Stat]int

// GenerationStat is the Pokédex stat for each generation that has an achievement.
var GenerationStat = map[int]Stat{1: StatKanto, 2: StatJohto, 3: StatHoenn}

// Achievement is unlocked when Stat reaches Goal. Achievements without a Stat
// are one-off actions (Goal 1), unlocked where the action happens.
type Achievement struct {
	Reward Reward
	Stat   Stat
	Goal   int
}

var Achievements = map[string]Achievement{
	"first_steps":         {Reward{50, "", 500}, StatCatches, 1},
	"getting_started":     {Reward{100, "", 1000}, StatCatches, 10},
	"collector":           {Reward{250, "type_pick", 5000}, StatCatches, 100},
	"master_collector":    {Reward{500, "legendary", 25000}, StatCatches, 1000},
	"explorer":            {Reward{100, "", 1000}, StatSites, 10},
	"web_surfer":          {Reward{250, "", 5000}, StatSites, 100},
	"netizen":             {Reward{500, "legendary", 25000}, StatSites, 1000},
	"letting_go":          {Reward{0, "", 250}, "", 1},
	"that_sounds_better":  {Reward{0, "", 250}, "", 1},
	"friendly":            {Reward{50, "", 500}, StatFriends, 1},
	"social_butterfly":    {Reward{0, "", 2500}, StatFriends, 10},
	"just_my_type":        {Reward{250, "type_pick", 5000}, StatTypes, len(Types)},
	"dedicated":           {Reward{100, "", 2500}, StatStreak, 7},
	"love_of_the_game":    {Reward{500, "legendary", 15000}, StatStreak, 30},
	"kanto_complete":      {Reward{500, "legendary", 25000}, StatKanto, 151},
	"johto_complete":      {Reward{500, "legendary", 25000}, StatJohto, 100},
	"hoenn_complete":      {Reward{500, "legendary", 25000}, StatHoenn, 135},
	"gotta_catch_em_all":  {Reward{0, "shiny", 50000}, StatDex, 386},
	"lucky_color":         {Reward{0, "", 2500}, "", 1},
	"shiny_hunter":        {Reward{2500, "mythical", 100000}, StatShinyKanto, 151},
	"identity_crisis":     {Reward{0, "", 250}, "", 1},
	"new_look":            {Reward{0, "", 250}, "", 1},
	"level_5":             {Reward{100, "", 1000}, StatLevel, 5},
	"level_10":            {Reward{150, "type_pick", 2500}, StatLevel, 10},
	"level_20":            {Reward{250, "type_pick", 5000}, StatLevel, 20},
	"level_30":            {Reward{375, "type_pick", 10000}, StatLevel, 30},
	"level_40":            {Reward{500, "type_pick", 15000}, StatLevel, 40},
	"level_50":            {Reward{750, "legendary", 25000}, StatLevel, 50},
	"legendary_encounter": {Reward{0, "", 5000}, "", 1},
	"team_player":         {Reward{0, "", 5000}, "", 1},
	"event_champion":      {Reward{0, "legendary", 15000}, "", 1},
}

// Reached lists the achievements whose stat is in p and has met its goal.
func Reached(p Progress) []string {
	var ids []string
	for id, a := range Achievements {
		if v, ok := p[a.Stat]; ok && a.Stat != "" && v >= a.Goal {
			ids = append(ids, id)
		}
	}
	slices.Sort(ids)
	return ids
}

// CatchAchievements lists the achievements a catch unlocks, given the
// trainer's progress after it.
func CatchAchievements(p Progress, shiny, legendary bool) []string {
	ids := Reached(p)
	if shiny {
		ids = append(ids, "lucky_color")
	}
	if legendary {
		ids = append(ids, "legendary_encounter")
	}
	return ids
}
