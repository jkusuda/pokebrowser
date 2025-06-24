// Complete Supabase client for Chrome extension
// This creates a client that works without external CDN dependencies

class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.auth = new SupabaseAuth(url, key);
    }

    from(table) {
        return new SupabaseQueryBuilder(this.url, this.key, table, this.auth);
    }
}

class SupabaseQueryBuilder {
    constructor(url, key, table, auth) {
        this.url = url;
        this.key = key;
        this.table = table;
        this.auth = auth;
        this.baseURL = `${url}/rest/v1`;
        this.query = {
            select: '*',
            filters: [],
            order: null,
            limit: null
        };
    }

    select(columns = '*') {
        this.query.select = columns;
        return this;
    }

    eq(column, value) {
        this.query.filters.push(`${column}=eq.${encodeURIComponent(value)}`);
        return this;
    }

    neq(column, value) {
        this.query.filters.push(`${column}=neq.${encodeURIComponent(value)}`);
        return this;
    }

    gt(column, value) {
        this.query.filters.push(`${column}=gt.${encodeURIComponent(value)}`);
        return this;
    }

    gte(column, value) {
        this.query.filters.push(`${column}=gte.${encodeURIComponent(value)}`);
        return this;
    }

    lt(column, value) {
        this.query.filters.push(`${column}=lt.${encodeURIComponent(value)}`);
        return this;
    }

    lte(column, value) {
        this.query.filters.push(`${column}=lte.${encodeURIComponent(value)}`);
        return this;
    }

    like(column, pattern) {
        this.query.filters.push(`${column}=like.${encodeURIComponent(pattern)}`);
        return this;
    }

    ilike(column, pattern) {
        this.query.filters.push(`${column}=ilike.${encodeURIComponent(pattern)}`);
        return this;
    }

    in(column, values) {
        const valueList = values.map(v => encodeURIComponent(v)).join(',');
        this.query.filters.push(`${column}=in.(${valueList})`);
        return this;
    }

    order(column, options = {}) {
        const direction = options.ascending === false ? 'desc' : 'asc';
        this.query.order = `${column}.${direction}`;
        return this;
    }

    limit(count) {
        this.query.limit = count;
        return this;
    }

    async insert(data) {
        try {
            const headers = await this._getHeaders();
            headers['Prefer'] = 'return=representation';

            const response = await fetch(`${this.baseURL}/${this.table}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(Array.isArray(data) ? data : [data])
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Insert failed');
            }

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async update(data) {
        try {
            const headers = await this._getHeaders();
            headers['Prefer'] = 'return=representation';

            let url = `${this.baseURL}/${this.table}`;
            if (this.query.filters.length > 0) {
                url += '?' + this.query.filters.join('&');
            }

            const response = await fetch(url, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Update failed');
            }

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async delete() {
        try {
            const headers = await this._getHeaders();
            headers['Prefer'] = 'return=representation';

            let url = `${this.baseURL}/${this.table}`;
            if (this.query.filters.length > 0) {
                url += '?' + this.query.filters.join('&');
            }

            const response = await fetch(url, {
                method: 'DELETE',
                headers
            });

            let result = null;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                result = await response.json();
            }

            if (!response.ok) {
                throw new Error(result?.message || 'Delete failed');
            }

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    async _execute() {
        try {
            const headers = await this._getHeaders();
            
            let url = `${this.baseURL}/${this.table}`;
            const params = [];

            if (this.query.select !== '*') {
                params.push(`select=${encodeURIComponent(this.query.select)}`);
            }

            if (this.query.filters.length > 0) {
                params.push(...this.query.filters);
            }

            if (this.query.order) {
                params.push(`order=${this.query.order}`);
            }

            if (this.query.limit) {
                params.push(`limit=${this.query.limit}`);
            }

            if (params.length > 0) {
                url += '?' + params.join('&');
            }

            const response = await fetch(url, {
                method: 'GET',
                headers
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Query failed');
            }

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    // This makes the query builder thenable, so it can be awaited directly
    then(resolve, reject) {
        return this._execute().then(resolve, reject);
    }

    async _getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': `Bearer ${this.key}`
        };

        // Add user token if available
        if (this.auth.currentSession && this.auth.currentSession.access_token) {
            headers['Authorization'] = `Bearer ${this.auth.currentSession.access_token}`;
        }

        return headers;
    }
}

class SupabaseAuth {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.baseURL = `${url}/auth/v1`;
        this.listeners = [];
        this.currentSession = null;
    }

    async getSession() {
        try {
            // Check if we have a stored session
            const stored = await this._getStoredSession();
            if (stored && this._isValidSession(stored)) {
                this.currentSession = stored;
                return { data: { session: stored }, error: null };
            }
            
            return { data: { session: null }, error: null };
        } catch (error) {
            return { data: { session: null }, error };
        }
    }

    async signInWithPassword({ email, password }) {
        try {
            const response = await fetch(`${this.baseURL}/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.key,
                    'Authorization': `Bearer ${this.key}`
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error_description || data.msg || 'Sign in failed');
            }

            const session = {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                expires_in: data.expires_in,
                expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
                user: data.user
            };

            await this._storeSession(session);
            this.currentSession = session;
            this._notifyListeners('SIGNED_IN', session);

            return { data: { session, user: data.user }, error: null };
        } catch (error) {
            return { data: { session: null, user: null }, error };
        }
    }

    async signUp({ email, password }) {
        try {
            const response = await fetch(`${this.baseURL}/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.key,
                    'Authorization': `Bearer ${this.key}`
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error_description || data.msg || 'Sign up failed');
            }

            // Handle email confirmation case
            if (data.user && !data.session) {
                return { 
                    data: { 
                        user: data.user, 
                        session: null 
                    }, 
                    error: null 
                };
            }

            // Handle instant sign-in case
            if (data.session) {
                const session = {
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_in: data.session.expires_in,
                    expires_at: Math.floor(Date.now() / 1000) + data.session.expires_in,
                    user: data.user
                };

                await this._storeSession(session);
                this.currentSession = session;
                this._notifyListeners('SIGNED_IN', session);

                return { data: { session, user: data.user }, error: null };
            }

            return { data: { user: data.user, session: null }, error: null };
        } catch (error) {
            return { data: { user: null, session: null }, error };
        }
    }

    async signOut() {
        try {
            if (this.currentSession) {
                // Attempt to revoke token on server
                try {
                    await fetch(`${this.baseURL}/logout`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': this.key,
                            'Authorization': `Bearer ${this.currentSession.access_token}`
                        }
                    });
                } catch (e) {
                    // Continue even if server logout fails
                    console.warn('Server logout failed:', e);
                }
            }

            await this._removeStoredSession();
            this.currentSession = null;
            this._notifyListeners('SIGNED_OUT', null);

            return { error: null };
        } catch (error) {
            return { error };
        }
    }

    onAuthStateChange(callback) {
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }

    async _getStoredSession() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['supabase_session'], (result) => {
                resolve(result.supabase_session || null);
            });
        });
    }

    async _storeSession(session) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ 'supabase_session': session }, () => {
                resolve();
            });
        });
    }

    async _removeStoredSession() {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['supabase_session'], () => {
                resolve();
            });
        });
    }

    _isValidSession(session) {
        if (!session || !session.expires_at) return false;
        return Math.floor(Date.now() / 1000) < session.expires_at;
    }

    _notifyListeners(event, session) {
        setTimeout(() => {
            this.listeners.forEach(callback => {
                try {
                    callback(event, session);
                } catch (error) {
                    console.error('Auth listener error:', error);
                }
            });
        }, 0);
    }
}

// Create the global supabase object that mimics the official client
window.supabase = {
    createClient: (url, key) => new SupabaseClient(url, key)
};
