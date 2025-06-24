// Configure your Supabase credentials here
const SUPABASE_URL = 'https://mzoxfiqdhbitwoyspnfm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM'; // Replace with your Supabase anon key

// Initialize Supabase client
let supabase;

// DOM elements
let authForm, authBtn, toggleLink, toggleText;
let emailInput, passwordInput, messageDiv, loadingDiv;

// State
let isSignUp = false;

// Initialize DOM elements
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

// Show loading state
function showLoading(show) {
    if (show) {
        loadingDiv.classList.remove('hidden');
    } else {
        loadingDiv.classList.add('hidden');
    }
}

// Show messages
function showMessage(text, type = 'error') {
    messageDiv.innerHTML = `<div class="message ${type}">${text}</div>`;
    setTimeout(() => {
        messageDiv.innerHTML = '';
    }, 5000);
}

// Toggle between sign in and sign up
function toggleAuthMode() {
    isSignUp = !isSignUp;
    
    if (isSignUp) {
        authBtn.textContent = 'Sign Up';
        toggleText.textContent = 'Already have an account?';
        toggleLink.textContent = 'Sign in';
    } else {
        authBtn.textContent = 'Sign In';
        toggleText.textContent = "Don't have an account?";
        toggleLink.textContent = 'Sign up';
    }
    
    // Clear form and messages
    authForm.reset();
    messageDiv.innerHTML = '';
}

// Handle authentication
async function handleAuth(e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
        showMessage('Please fill in all fields', 'error');
        return;
    }
    
    if (password.length < 6) {
        showMessage('Password must be at least 6 characters', 'error');
        return;
    }
    
    showLoading(true);
    authBtn.disabled = true;
    
    try {
        let result;
        
        if (isSignUp) {
            result = await supabase.auth.signUp({
                email: email,
                password: password,
            });
        } else {
            result = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
        }
        
        const { data, error } = result;
        
        if (error) {
            throw error;
        }
        
        if (isSignUp) {
            if (data.user && !data.session) {
                showMessage('Please check your email for verification link', 'success');
            } else if (data.session) {
                showMessage('Account created successfully!', 'success');
                setTimeout(() => {
                    window.close();
                }, 1500);
            }
        } else {
            if (data.session) {
                showMessage('Signed in successfully!', 'success');
                setTimeout(() => {
                    window.close();
                }, 1500);
            }
        }
        
    } catch (error) {
        console.error('Auth error:', error);
        
        // Handle specific error messages
        let errorMessage = 'Authentication failed';
        
        if (error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password';
        } else if (error.message.includes('User already registered')) {
            errorMessage = 'An account with this email already exists';
        } else if (error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and click the confirmation link';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showMessage(errorMessage, 'error');
    } finally {
        showLoading(false);
        authBtn.disabled = false;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initElements();
    
    // Initialize Supabase client
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Set up event listeners
        authForm.addEventListener('submit', handleAuth);
        toggleLink.addEventListener('click', toggleAuthMode);
        
        // Check if already authenticated
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                showMessage('Already signed in!', 'success');
                setTimeout(() => {
                    window.close();
                }, 1000);
            }
        });
    } else {
        showMessage('Authentication system not available', 'error');
    }
});
