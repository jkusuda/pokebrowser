package game

// XPForLevel is the total XP needed to reach level n: 500·n·(n−1).
func XPForLevel(n int) int { return 500 * n * (n - 1) }

// Level returns the highest level whose XP threshold xp has reached.
func Level(xp int) int {
	n := 1
	for XPForLevel(n+1) <= xp {
		n++
	}
	return n
}
