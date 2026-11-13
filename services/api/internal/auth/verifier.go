package auth

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var ErrInvalidToken = errors.New("invalid token")

type Identity struct {
	UserID uuid.UUID
	Email  string
}

type KeySource interface {
	Key(ctx context.Context, kid string) (any, error)
}

// Verifier checks Supabase access tokens locally. Asymmetric tokens are checked
// against keys; legacy HS256 tokens against secret. Either may be unset.
type Verifier struct {
	keys   KeySource
	secret []byte
	issuer string
	now    func() time.Time
}

func NewVerifier(issuer string, keys KeySource, hs256Secret string) *Verifier {
	return &Verifier{keys: keys, secret: []byte(hs256Secret), issuer: issuer, now: time.Now}
}

type claims struct {
	jwt.RegisteredClaims
	Email string `json:"email"`
	Role  string `json:"role"`
}

func (v *Verifier) Verify(ctx context.Context, token string) (Identity, error) {
	var c claims
	_, err := jwt.ParseWithClaims(token, &c,
		func(t *jwt.Token) (any, error) { return v.keyFor(ctx, t) },
		jwt.WithValidMethods([]string{"ES256", "RS256", "HS256"}),
		jwt.WithIssuer(v.issuer),
		jwt.WithAudience("authenticated"),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30*time.Second),
		jwt.WithStrictDecoding(),
		jwt.WithTimeFunc(v.now),
	)
	if err != nil {
		return Identity{}, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}
	// The anon and service-role keys are valid Supabase JWTs too.
	if c.Role != "authenticated" {
		return Identity{}, fmt.Errorf("%w: role %q", ErrInvalidToken, c.Role)
	}
	id, err := uuid.Parse(c.Subject)
	if err != nil {
		return Identity{}, fmt.Errorf("%w: sub is not a user id", ErrInvalidToken)
	}
	return Identity{UserID: id, Email: c.Email}, nil
}

func (v *Verifier) keyFor(ctx context.Context, t *jwt.Token) (any, error) {
	switch t.Method.(type) {
	case *jwt.SigningMethodHMAC:
		if len(v.secret) == 0 {
			return nil, errors.New("HS256 not accepted: no secret configured")
		}
		return v.secret, nil
	case *jwt.SigningMethodECDSA, *jwt.SigningMethodRSA:
		if v.keys == nil {
			return nil, errors.New("asymmetric tokens not accepted: no JWKS configured")
		}
		kid, _ := t.Header["kid"].(string)
		if kid == "" {
			return nil, errors.New("token has no kid")
		}
		return v.keys.Key(ctx, kid)
	default:
		return nil, fmt.Errorf("unexpected signing method %v", t.Header["alg"])
	}
}

type ctxKey struct{}

func WithIdentity(ctx context.Context, id Identity) context.Context {
	return context.WithValue(ctx, ctxKey{}, id)
}

func FromContext(ctx context.Context) (Identity, bool) {
	id, ok := ctx.Value(ctxKey{}).(Identity)
	return id, ok
}
