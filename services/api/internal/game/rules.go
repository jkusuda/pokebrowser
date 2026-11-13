package game

import (
	"slices"
	"time"
)

const (
	EncounterRate      = 0.15
	RollCooldown       = 15 * time.Second
	EncounterTTL       = 5 * time.Minute
	CatchCooldown      = 1500 * time.Millisecond
	DailyCatchCap      = 500
	BaseShinyChance    = 1.0 / 512
	CatchCandy         = 3
	LevelUpCandy       = 10
	MaxFriends         = 100
	MaxBlockedSites    = 100
	MaxDisplayedBadges = 3
	MaxMultiplier      = 100
	LeaderboardSize    = 100
	TokenCatchSite     = "pokebrowser.net"
)

var Types = []string{
	"normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
	"flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
}

func IsType(t string) bool { return slices.Contains(Types, t) }

var TokenTypes = []string{"legendary", "mythical", "type_pick", "shiny", "species"}

func IsTokenType(t string) bool { return slices.Contains(TokenTypes, t) }

// UTCDay truncates t to its UTC calendar day, the unit for daily caps and streaks.
func UTCDay(t time.Time) time.Time {
	y, m, d := t.UTC().Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.UTC)
}
