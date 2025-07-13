import React from 'react';

const LoadingState = () => {
  return (
    <div className="container">
      <div className="loading">
        <div className="loading-text">Loading Pokemon...</div>
        <div className="pokeball-spinner"></div>
      </div>
    </div>
  );
};

export default LoadingState;
