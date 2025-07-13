import React from 'react';

const ErrorState = ({ message = 'An error occurred' }) => {
  return (
    <div className="container">
      <div className="error">
        <div className="error-icon">❌</div>
        <div className="error-title">Pokemon Not Found</div>
        <div className="error-message">{message}</div>
      </div>
    </div>
  );
};

export default ErrorState;
