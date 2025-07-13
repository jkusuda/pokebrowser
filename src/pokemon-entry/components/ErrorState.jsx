import React from 'react';

const ErrorState = () => {
  return (
    <div className="container">
      <div className="error">
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Pokemon Not Found</div>
        <div style={{ fontSize: '14px', marginTop: '5px' }}>
          Please check the Pokemon ID and try again.
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
