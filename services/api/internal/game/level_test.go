package game

import "testing"

func TestLevel(t *testing.T) {
	cases := []struct{ xp, want int }{
		{-5, 1}, {0, 1}, {999, 1},
		{1000, 2}, {2999, 2},
		{3000, 3},
		{XPForLevel(50) - 1, 49}, {XPForLevel(50), 50},
	}
	for _, c := range cases {
		if got := Level(c.xp); got != c.want {
			t.Errorf("Level(%d) = %d, want %d", c.xp, got, c.want)
		}
	}
}
