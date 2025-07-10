/**
 * Environment configuration for development vs production
 */

const ENVIRONMENTS = {
    development: {
        SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM',
        ENABLE_DEBUGGING: true,
        RATE_LIMIT_ENABLED: false
    },
    production: {
        SUPABASE_URL: 'https://mzoxfiqdhbitwoyspnfm.supabase.co',
        SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16b3hmaXFkaGJpdHdveXNwbmZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3OTIyMjIsImV4cCI6MjA2NjM2ODIyMn0.YbxebGzAZne6i3kZFfZPp1U3F-ewYIHy8gaaw9q1zkM',
        ENABLE_DEBUGGING: false,
        RATE_LIMIT_ENABLED: true
    }
};

// Detect environment - you can change this logic as needed
const getCurrentEnvironment = () => {
    // In production, you might detect this differently
    // For now, we'll use a simple check
    if (chrome?.runtime?.getManifest?.()?.version?.includes('dev')) {
        return 'development';
    }
    return 'production';
};

export const ENV_CONFIG = ENVIRONMENTS[getCurrentEnvironment()];
export const IS_PRODUCTION = getCurrentEnvironment() === 'production';
export const IS_DEVELOPMENT = getCurrentEnvironment() === 'development';
