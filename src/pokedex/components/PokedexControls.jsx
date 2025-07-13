import React from 'react';

const PokedexControls = ({ searchQuery, sortBy, onSearch, onSort, onRefresh }) => {
  const handleSearchChange = (e) => {
    onSearch(e.target.value);
  };

  const handleSortChange = (e) => {
    onSort(e.target.value);
  };

  return (
    <div className="pokedex-controls">
      <input 
        type="search" 
        value={searchQuery}
        onChange={handleSearchChange}
        placeholder="Search by name or ID..."
      />
      <select value={sortBy} onChange={handleSortChange}>
        <option value="id">Sort by ID</option>
        <option value="name">Sort by Name</option>
        <option value="caughtAt">Sort by Recent Catch</option>
        <option value="firstCaught">Sort by First Caught</option>
      </select>
      <button onClick={onRefresh} className="refresh-btn">
        🔄 Refresh
      </button>
    </div>
  );
};

export default PokedexControls;
