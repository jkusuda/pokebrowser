package auth

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

const testIssuer = "http://supabase.test/auth/v1"

var (
	userID   = uuid.MustParse("a5a5a5a5-0000-4000-8000-000000000001")
	baseTime = time.Date(2026, 11, 12, 12, 0, 0, 0, time.UTC)
)

type jwksServer struct {
	*httptest.Server
	hits atomic.Int32
	keys atomic.Value // map[string]*ecdsa.PrivateKey
}

func newJWKSServer(t *testing.T, keys map[string]*ecdsa.PrivateKey) *jwksServer {
	s := &jwksServer{}
	s.keys.Store(keys)
	s.Server = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		s.hits.Add(1)
		var set struct {
			Keys []map[string]string `json:"keys"`
		}
		for kid, k := range s.keys.Load().(map[string]*ecdsa.PrivateKey) {
			pub, _ := k.PublicKey.Bytes()
			set.Keys = append(set.Keys, map[string]string{
				"kid": kid, "kty": "EC", "crv": "P-256", "alg": "ES256",
				"x": base64.RawURLEncoding.EncodeToString(pub[1:33]),
				"y": base64.RawURLEncoding.EncodeToString(pub[33:]),
			})
		}
		json.NewEncoder(w).Encode(set)
	}))
	t.Cleanup(s.Close)
	return s
}

func newKey(t *testing.T) *ecdsa.PrivateKey {
	k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return k
}

func validClaims() jwt.MapClaims {
	return jwt.MapClaims{
		"iss":   testIssuer,
		"sub":   userID.String(),
		"aud":   "authenticated",
		"role":  "authenticated",
		"email": "ash@local.test",
		"iat":   baseTime.Unix(),
		"exp":   baseTime.Add(time.Hour).Unix(),
	}
}

func signES256(t *testing.T, key *ecdsa.PrivateKey, kid string, c jwt.MapClaims) string {
	tok := jwt.NewWithClaims(jwt.SigningMethodES256, c)
	tok.Header["kid"] = kid
	s, err := tok.SignedString(key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func newTestVerifier(jwksURL, secret string) (*Verifier, *JWKS) {
	var keys KeySource
	var j *JWKS
	if jwksURL != "" {
		j = NewJWKS(jwksURL, nil)
		j.now = func() time.Time { return baseTime }
		keys = j
	}
	v := NewVerifier(testIssuer, keys, secret)
	v.now = func() time.Time { return baseTime }
	return v, j
}

func TestVerifyES256(t *testing.T) {
	key := newKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})
	v, _ := newTestVerifier(srv.URL, "")

	id, err := v.Verify(context.Background(), signES256(t, key, "k1", validClaims()))
	if err != nil {
		t.Fatalf("valid token rejected: %v", err)
	}
	if id.UserID != userID || id.Email != "ash@local.test" {
		t.Errorf("identity = %+v", id)
	}
}

func TestVerifyRejects(t *testing.T) {
	key := newKey(t)
	otherKey := newKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": key})

	with := func(k string, v any) jwt.MapClaims {
		c := validClaims()
		if v == nil {
			delete(c, k)
		} else {
			c[k] = v
		}
		return c
	}

	cases := []struct {
		name  string
		token string
	}{
		{"expired", signES256(t, key, "k1", with("exp", baseTime.Add(-time.Minute).Unix()))},
		{"no expiry", signES256(t, key, "k1", with("exp", nil))},
		{"wrong issuer", signES256(t, key, "k1", with("iss", "https://evil.test/auth/v1"))},
		{"wrong audience", signES256(t, key, "k1", with("aud", "something-else"))},
		{"anon role", signES256(t, key, "k1", with("role", "anon"))},
		{"service role", signES256(t, key, "k1", with("role", "service_role"))},
		{"sub not a uuid", signES256(t, key, "k1", with("sub", "nope"))},
		{"signed by a different key", signES256(t, otherKey, "k1", validClaims())},
		{"unknown kid", signES256(t, key, "k2", validClaims())},
		{"garbage", "not.a.jwt"},
		{"non-canonical signature encoding", nonCanonical(signES256(t, key, "k1", validClaims()))},
		{"alg none", func() string {
			s, _ := jwt.NewWithClaims(jwt.SigningMethodNone, validClaims()).SignedString(jwt.UnsafeAllowNoneSignatureType)
			return s
		}()},
		{"HS256 without a configured secret", func() string {
			s, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims()).SignedString([]byte("guess"))
			return s
		}()},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			v, _ := newTestVerifier(srv.URL, "")
			_, err := v.Verify(context.Background(), tc.token)
			if !errors.Is(err, ErrInvalidToken) {
				t.Fatalf("want ErrInvalidToken, got %v", err)
			}
		})
	}
}

func TestVerifyHS256(t *testing.T) {
	v, _ := newTestVerifier("", "legacy-secret")

	good, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims()).SignedString([]byte("legacy-secret"))
	if _, err := v.Verify(context.Background(), good); err != nil {
		t.Fatalf("valid HS256 token rejected: %v", err)
	}

	bad, _ := jwt.NewWithClaims(jwt.SigningMethodHS256, validClaims()).SignedString([]byte("wrong-secret"))
	if _, err := v.Verify(context.Background(), bad); !errors.Is(err, ErrInvalidToken) {
		t.Fatalf("HS256 token with wrong secret: want ErrInvalidToken, got %v", err)
	}
}

func TestJWKSCachesAndRotates(t *testing.T) {
	k1, k2 := newKey(t), newKey(t)
	srv := newJWKSServer(t, map[string]*ecdsa.PrivateKey{"k1": k1})
	v, j := newTestVerifier(srv.URL, "")
	now := baseTime
	j.now = func() time.Time { return now }
	ctx := context.Background()

	for range 3 {
		if _, err := v.Verify(ctx, signES256(t, k1, "k1", validClaims())); err != nil {
			t.Fatal(err)
		}
	}
	if got := srv.hits.Load(); got != 1 {
		t.Fatalf("JWKS fetched %d times for 3 tokens, want 1", got)
	}

	// A rotated-in key is picked up once minRefetch has passed.
	srv.keys.Store(map[string]*ecdsa.PrivateKey{"k1": k1, "k2": k2})
	if _, err := v.Verify(ctx, signES256(t, k2, "k2", validClaims())); err == nil {
		t.Fatal("unknown kid accepted before a refetch was allowed")
	}
	now = now.Add(time.Minute)
	if _, err := v.Verify(ctx, signES256(t, k2, "k2", validClaims())); err != nil {
		t.Fatalf("rotated key not picked up: %v", err)
	}
	if got := srv.hits.Load(); got != 2 {
		t.Fatalf("JWKS fetched %d times, want 2", got)
	}
}

// nonCanonical flips an unused low bit in the last base64 char: the signature
// decodes to the same bytes, so only strict decoding rejects it.
func nonCanonical(token string) string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
	last := strings.IndexByte(alphabet, token[len(token)-1])
	return token[:len(token)-1] + string(alphabet[last^1])
}
