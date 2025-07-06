// Supabase credentials
const SUPABASE_URL = 'https://mzoxfiqdhbitwoyspnfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM';

// Supabase client
let supabase;

// DOM elements
let authForm, authBtn, toggleLink, toggleText;
let emailInput, passwordInput, messageDiv, loadingDiv;

// Application state
let isSignUp = false;

/**
 * Initializes DOM elements for authentication.
 */
function initElements() {
    authForm = document.getElementById('auth-form');
    authBtn = document.getElementById('auth-btn');
    toggleLink = document.getElementById('toggle-link');
    toggleText = document.getElementById('toggle-text');
    emailInput = document.getElementById('email');
    passwordInput = document.getElementById('password');
    messageDiv = document.getElementById('message');
    loadingDiv = document.getElementById('loading');
}

/**
 * Toggles the visibility of the loading indicator.
 * @param {boolean} show - Whether to show the loading indicator.
 */
function showLoading(show) {
    loadingDiv.classList.toggle('hidden', !show);
}

/**
 * Displays a message to the user.
 * @param {string} text - The message to display.
 * @param {string} type - The type of message (e.g., 'success', 'error').
 */
function showMessage(text, type = 'error') {
    messageDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(() => messageDiv.innerHTML = '', 5000);
}

/**
 * Toggles between sign-in and sign-up modes.
 */
function toggleAuthMode() {
    isSignUp = !isSignUp;
    authBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
    toggleText.textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
    toggleLink.textContent = isSignUp ? 'Sign in' : 'Sign up';
    authForm.reset();
    messageDiv.innerHTML = '';
}

/**
 * Handles the authentication process.
 * @param {Event} e - The form submission event.
 */
async function handleAuth(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        return showMessage('Please fill in all fields', 'error');
    }
    if (password.length < 6) {
        return showMessage('Password must be at least 6 characters', 'error');
    }
    
    showLoading(true);
    authBtn.disabled = true;
    
    try {
        const { data, error } = isSignUp 
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });

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
        showLoading(false);
        authBtn.disabled = false;
    }
}

/**
 * Returns a user-friendly error message.
 * @param {Error} error - The error object.
 * @returns {string} - The error message.
 */
function getErrorMessage(error) {
    if (error.message.includes('Invalid login credentials')) return 'Invalid email or password';
    if (error.message.includes('User already registered')) return 'An account with this email already exists';
    if (error.message.includes('Email not confirmed')) return 'Please check your email and click the confirmation link';
    return error.message || 'Authentication failed';
}

/**
 * Initializes the application when the DOM is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        authForm.addEventListener('submit', handleAuth);
        toggleLink.addEventListener('click', toggleAuthMode);
        
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                showMessage('Already signed in!', 'success');
                setTimeout(() => window.close(), 1000);
            }
        });
    } else {
        showMessage('Authentication system not available', 'error');
    }
});
