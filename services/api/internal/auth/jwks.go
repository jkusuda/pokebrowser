package auth

import (
	"context"
	"crypto"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sync"
	"time"
)

var ErrUnknownKey = errors.New("unknown signing key")

// JWKS caches Supabase's public signing keys. It refetches when a token names
// an unknown kid or the cache is older than maxAge, at most once per minRefetch.
type JWKS struct {
	url        string
	client     *http.Client
	now        func() time.Time
	maxAge     time.Duration
	minRefetch time.Duration

	mu        sync.Mutex
	keys      map[string]crypto.PublicKey
	fetchedAt time.Time
}

func NewJWKS(url string, client *http.Client) *JWKS {
	if client == nil {
		client = &http.Client{Timeout: 5 * time.Second}
	}
	return &JWKS{
		url:        url,
		client:     client,
		now:        time.Now,
		maxAge:     10 * time.Minute,
		minRefetch: 30 * time.Second,
	}
}

func (j *JWKS) Key(ctx context.Context, kid string) (any, error) {
	j.mu.Lock()
	defer j.mu.Unlock()

	key, ok := j.keys[kid]
	age := j.now().Sub(j.fetchedAt)
	if ok && age <= j.maxAge {
		return key, nil
	}

	if age >= j.minRefetch {
		if err := j.refetch(ctx); err != nil {
			if ok {
				return key, nil // Supabase unreachable: keep trusting a known key
			}
			return nil, err
		}
		key, ok = j.keys[kid]
	}
	if !ok {
		return nil, fmt.Errorf("%w %q", ErrUnknownKey, kid)
	}
	return key, nil
}

func (j *JWKS) refetch(ctx context.Context) error {
	j.fetchedAt = j.now()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, j.url, nil)
	if err != nil {
		return err
	}
	resp, err := j.client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch jwks: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("fetch jwks: status %d", resp.StatusCode)
	}

	var set struct {
		Keys []jwk `json:"keys"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 1<<20)).Decode(&set); err != nil {
		return fmt.Errorf("decode jwks: %w", err)
	}

	keys := make(map[string]crypto.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		if pub, err := k.publicKey(); err == nil {
			keys[k.Kid] = pub
		}
	}
	j.keys = keys
	return nil
}

type jwk struct {
	Kid string `json:"kid"`
	Kty string `json:"kty"`
	Crv string `json:"crv"`
	X   string `json:"x"`
	Y   string `json:"y"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func (k jwk) publicKey() (crypto.PublicKey, error) {
	b64 := base64.RawURLEncoding
	switch k.Kty {
	case "EC":
		if k.Crv != "P-256" {
			return nil, fmt.Errorf("unsupported curve %q", k.Crv)
		}
		x, err1 := b64.DecodeString(k.X)
		y, err2 := b64.DecodeString(k.Y)
		if err := errors.Join(err1, err2); err != nil {
			return nil, err
		}
		point := append([]byte{4}, leftPad(x, 32)...)
		point = append(point, leftPad(y, 32)...)
		return ecdsa.ParseUncompressedPublicKey(elliptic.P256(), point)
	case "RSA":
		n, err1 := b64.DecodeString(k.N)
		e, err2 := b64.DecodeString(k.E)
		if err := errors.Join(err1, err2); err != nil {
			return nil, err
		}
		return &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}, nil
	default:
		return nil, fmt.Errorf("unsupported key type %q", k.Kty)
	}
}

func leftPad(b []byte, n int) []byte {
	if len(b) >= n {
		return b
	}
	return append(make([]byte, n-len(b)), b...)
}
