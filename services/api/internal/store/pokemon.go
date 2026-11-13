package store

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Pokemon struct {
	ID            uuid.UUID
	UserID        uuid.UUID
	PokedexNumber int
	Nickname      *string
	IsShiny       bool
	CaughtAt      time.Time
	CaughtOn      *string
}

const pokemonColumns = `id, user_id, pokedex_number, nickname, is_shiny, caught_at, caught_on`

func scanPokemon(row interface{ Scan(...any) error }) (Pokemon, error) {
	var p Pokemon
	err := row.Scan(&p.ID, &p.UserID, &p.PokedexNumber, &p.Nickname, &p.IsShiny, &p.CaughtAt, &p.CaughtOn)
	return p, notFound(err)
}

// ListPokemon returns a trainer's Pokémon, newest first. limit <= 0 means all.
func (q *Q) ListPokemon(ctx context.Context, userID uuid.UUID, limit int) ([]Pokemon, error) {
	rows, err := q.db.Query(ctx, `
		select `+pokemonColumns+` from public.pokemon
		where user_id = $1
		order by caught_at desc, id
		limit nullif($2, 0)`, userID, max(limit, 0))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	list := []Pokemon{}
	for rows.Next() {
		p, err := scanPokemon(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (q *Q) GetPokemon(ctx context.Context, id uuid.UUID) (Pokemon, error) {
	return scanPokemon(q.db.QueryRow(ctx, `select `+pokemonColumns+` from public.pokemon where id = $1`, id))
}

// GetOwnedPokemon locks and returns a Pokémon only if userID owns it.
func (q *Q) GetOwnedPokemon(ctx context.Context, userID, id uuid.UUID) (Pokemon, error) {
	return scanPokemon(q.db.QueryRow(ctx, `
		select `+pokemonColumns+` from public.pokemon
		where id = $1 and user_id = $2 for update`, id, userID))
}

func (q *Q) PokemonByEncounter(ctx context.Context, userID, encounterID uuid.UUID) (Pokemon, error) {
	return scanPokemon(q.db.QueryRow(ctx, `
		select `+pokemonColumns+` from public.pokemon
		where user_id = $1 and encounter_id = $2`, userID, encounterID))
}

func (q *Q) CountPokemon(ctx context.Context, userID uuid.UUID) (int, error) {
	var n int
	err := q.db.QueryRow(ctx, `select count(*) from public.pokemon where user_id = $1`, userID).Scan(&n)
	return n, err
}

type NewPokemon struct {
	UserID        uuid.UUID
	PokedexNumber int
	Nickname      string
	IsShiny       bool
	CaughtOn      string
	EncounterID   *uuid.UUID
}

func (q *Q) InsertPokemon(ctx context.Context, p NewPokemon) (uuid.UUID, error) {
	var id uuid.UUID
	err := q.db.QueryRow(ctx, `
		insert into public.pokemon (user_id, pokedex_number, nickname, is_shiny, caught_on, encounter_id)
		values ($1, $2, $3, $4, nullif($5, ''), $6)
		returning id`, p.UserID, p.PokedexNumber, p.Nickname, p.IsShiny, p.CaughtOn, p.EncounterID).Scan(&id)
	return id, err
}

func (q *Q) UpdatePokemon(ctx context.Context, id uuid.UUID, pokedexNumber int, nickname *string) error {
	_, err := q.db.Exec(ctx, `
		update public.pokemon set pokedex_number = $2, nickname = $3 where id = $1`, id, pokedexNumber, nickname)
	return err
}

func (q *Q) DeletePokemon(ctx context.Context, id uuid.UUID) error {
	_, err := q.db.Exec(ctx, `delete from public.pokemon where id = $1`, id)
	return err
}
