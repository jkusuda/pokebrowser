import React, { useState, useEffect } from 'react';
import { AppState } from '../utils/AppState.js';
import { AuthService } from '../services/AuthService.js';
import { CONFIG } from '../shared/config.js';

const AuthApp = () => {
  // State management
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Services (initialized once)
  const [services] = useState(() => {
    const state = new AppState();
    return {
      state,
      auth: new AuthService(state)
    };
  });

  // Show message helper
  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  // Get user-friendly error message
  const getErrorMessage = (error) => {
    if (error.message.includes('Invalid login credentials')) return 'Invalid email or password';
    if (error.message.includes('User already registered')) return 'An account with this email already exists';
    if (error.message.includes('Email not confirmed')) return 'Please check your email and click the confirmation link';
    return error.message || 'Authentication failed';
  };

  // Toggle between sign-in and sign-up modes
  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setMessage('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      return showMessage('Please fill in all fields', 'error');
    }
    if (password.length < 6) {
      return showMessage('Password must be at least 6 characters', 'error');
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = isSignUp 
        ? await services.state.supabase.auth.signUp({ email, password })
        : await services.state.supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (isSignUp) {
        showMessage(data.session ? 'Account created successfully!' : 'Please check your email for verification link', 'success');
      } else if (data.session) {
        showMessage('Signed in successfully!', 'success');
      }
      
      if (data.session) {
        setTimeout(() => window.close(), 1500);
      }
    } catch (error) {
      console.error('Auth error:', error);
      const errorMessage = getErrorMessage(error);
      showMessage(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize Supabase and check existing session
  useEffect(() => {
    const initialize = async () => {
      try {
        await services.auth.initializeSupabase();
        
        // Check if user is already signed in
        const { data: { session } } = await services.state.supabase.auth.getSession();
        if (session) {
          showMessage('Already signed in!', 'success');
          setTimeout(() => window.close(), 1000);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        showMessage('Authentication system not available', 'error');
        setIsInitialized(true);
      }
    };

    initialize();
  }, [services.auth, services.state]);

  if (!isInitialized) {
    return (
      <div className="auth-container">
        <div className="header">
          <h1>POKÉBROWSER</h1>
          <p>Trainer Authentication System</p>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="header">
        <h1>POKÉBROWSER</h1>
        <p>Trainer Authentication System</p>
      </div>
      
      <div className="auth-container">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Trainer Email</label>
            <input 
              type="email" 
              id="email" 
              placeholder="trainer@pokemon.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              placeholder="Enter your password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="btn" 
            disabled={isLoading}
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
          
          {message && (
            <div id="message">
              <div className={`message ${messageType}`}>{message}</div>
            </div>
          )}
          
          <div className="toggle-section">
            <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
            <span className="toggle-link" onClick={toggleAuthMode}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </span>
          </div>
        </form>
      </div>
      
      {isLoading && (
        <div className="loading-screen" id="loading">
          <div className="spinner"></div>
          <span>Authenticating...</span>
        </div>
      )}
    </>
  );
};

export default AuthApp;
