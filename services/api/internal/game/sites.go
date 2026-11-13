package game

import (
	"regexp"
	"slices"
	"strings"
)

var (
	hostChars = regexp.MustCompile(`^[a-z0-9._-]+$`)
	labelRe   = regexp.MustCompile(`^[a-z0-9-]+$`)
	schemeRe  = regexp.MustCompile(`^[a-z][a-z0-9+.-]*://`)
)

// CaughtOn normalizes the self-reported site of a catch, or returns "" if it
// doesn't look like a hostname.
func CaughtOn(s string) string {
	s = strings.ToLower(s)
	if len(s) > 253 || !hostChars.MatchString(s) {
		return ""
	}
	return s
}

// NormalizeHostname turns user input like "https://www.Example.com/x" into
// "example.com", or returns "" if it isn't a valid hostname.
func NormalizeHostname(in string) string {
	h := strings.ToLower(strings.TrimSpace(in))
	h = schemeRe.ReplaceAllString(h, "")
	h, _, _ = strings.Cut(h, "/")
	h, _, _ = strings.Cut(h, "?")
	h, _, _ = strings.Cut(h, "#")
	if i := strings.LastIndex(h, "@"); i >= 0 {
		h = h[i+1:]
	}
	h, _, _ = strings.Cut(h, ":")
	h = strings.TrimRight(h, ".")
	h = strings.TrimPrefix(h, "www.")

	if h == "" || len(h) > 253 || (!strings.Contains(h, ".") && h != "localhost") {
		return ""
	}
	for _, label := range strings.Split(h, ".") {
		if len(label) == 0 || len(label) > 63 || !labelRe.MatchString(label) ||
			strings.HasPrefix(label, "-") || strings.HasSuffix(label, "-") {
			return ""
		}
	}
	return h
}

// BlockedSites cleans a blocked-sites list; ok is false if any entry is invalid.
func BlockedSites(in []string) (out []string, ok bool) {
	if len(in) > MaxBlockedSites {
		return nil, false
	}
	out = []string{}
	for _, s := range in {
		h := NormalizeHostname(s)
		if h == "" {
			return nil, false
		}
		if !slices.Contains(out, h) {
			out = append(out, h)
		}
	}
	return out, true
}
