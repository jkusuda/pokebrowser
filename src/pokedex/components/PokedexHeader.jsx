import React from 'react';

const PokedexHeader = ({ stats }) => {
  return (
    <header className="pokedex-header">
      <h1>Pokedex</h1>
      <div className="pokedex-stats">
        <div className="stat">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat">
          <span className="stat-number">{stats.unique}</span>
          <span className="stat-label">Unique</span>
        </div>
        <div className="stat">
          <span className="stat-number">{stats.completion}%</span>
          <span className="stat-label">Completion</span>
        </div>
      </div>
    </header>
  );
};

export default PokedexHeader;
