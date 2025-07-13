import React from 'react';

const StatsSection = ({ stats }) => {
  return (
    <div className="stats-section">
      <div className="stats card">
        <div className="stat">
          <span className="stat-number">
            {String(stats.totalCaught).padStart(3, '0')}
          </span>
          <span className="stat-label">Caught</span>
        </div>
        <div className="stat">
          <span className="stat-number">
            {String(stats.uniquePokemon).padStart(3, '0')}
          </span>
          <span className="stat-label">Species</span>
        </div>
      </div>
    </div>
  );
};

export default StatsSection;
