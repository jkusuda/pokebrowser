package game

import "time"

// Streaks returns the newest and the longest run of consecutive days.
// days must be distinct UTC days in ascending order.
func Streaks(days []time.Time) (current, longest int) {
	for i, d := range days {
		if i > 0 && d.Sub(days[i-1]) == 24*time.Hour {
			current++
		} else {
			current = 1
		}
		longest = max(longest, current)
	}
	return current, longest
}
