import React from 'react';

const AuthSection = ({ user, syncStatus, onLogin, onLogout }) => {
  return (
    <div className="auth-section card">
      {!user ? (
        <div id="logged-out-state">
          <h3>CLOUD STORAGE</h3>
          <p>Log in to collect candies and sync your collection across devices!</p>
          <button 
            className="btn secondary" 
            onClick={onLogin}
            aria-label="Login or sign up"
          >
            LOGIN
          </button>
        </div>
      ) : (
        <div id="logged-in-state">
          <div className="user-info" aria-live="polite">
            Trainer: {user.email}
          </div>
          <div className={`sync-status ${syncStatus.type}`} aria-live="polite">
            {syncStatus.message}
          </div>
          <button 
            className="btn" 
            onClick={onLogout}
            aria-label="Logout"
          >
            LOGOUT
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthSection;
