package store

import (
	"context"

	"github.com/jkusuda/pokebrowser/services/api/internal/game"
)

func (q *Q) LoadCatalog(ctx context.Context) (*game.Catalog, error) {
	rows, err := q.db.Query(ctx, `
		select id, name, types::text[], is_legendary, is_mythical, family_base_id, generation
		from public.pokemon_species order by id`)
	if err != nil {
		return nil, err
	}
	var species []game.Species
	for rows.Next() {
		var s game.Species
		if err := rows.Scan(&s.ID, &s.Name, &s.Types, &s.Legendary, &s.Mythical, &s.FamilyBaseID, &s.Generation); err != nil {
			return nil, err
		}
		species = append(species, s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	rows, err = q.db.Query(ctx, `select from_id, to_id, candy_cost from public.pokemon_evolutions`)
	if err != nil {
		return nil, err
	}
	evolutions := map[int][]game.Evolution{}
	for rows.Next() {
		var from int
		var e game.Evolution
		if err := rows.Scan(&from, &e.To, &e.Cost); err != nil {
			return nil, err
		}
		evolutions[from] = append(evolutions[from], e)
	}
	return game.NewCatalog(species, evolutions), rows.Err()
}
