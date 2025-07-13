import React from 'react';

const SyncIndicator = () => {
  const indicatorStyle = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    background: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '5px 10px',
    borderRadius: '15px',
    fontSize: '12px',
    zIndex: 10000,
    animation: 'pulse 1s infinite'
  };

  return (
    <div style={indicatorStyle}>
      🔄
    </div>
  );
};

export default SyncIndicator;
