// Simplified Supabase client for Chrome extension
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
        this.query = { select: '*', filters: [], order: null, limit: null };
    }

    select(columns = '*') {
        this.query.select = columns;
        return this;
    }

    // Simplified filter methods using a helper
    eq(column, value) { return this._addFilter(column, 'eq', value); }
    neq(column, value) { return this._addFilter(column, 'neq', value); }
    gt(column, value) { return this._addFilter(column, 'gt', value); }
    gte(column, value) { return this._addFilter(column, 'gte', value); }
    lt(column, value) { return this._addFilter(column, 'lt', value); }
    lte(column, value) { return this._addFilter(column, 'lte', value); }
    like(column, pattern) { return this._addFilter(column, 'like', pattern); }
    ilike(column, pattern) { return this._addFilter(column, 'ilike', pattern); }

    _addFilter(column, operator, value) {
        this.query.filters.push(`${column}=${operator}.${encodeURIComponent(value)}`);
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

    // Simplified CRUD operations using a common request helper
    async insert(data) {
        return this._request('POST', Array.isArray(data) ? data : [data], { 'Prefer': 'return=representation' });
    }

    async update(data) {
        return this._request('PATCH', data, { 'Prefer': 'return=representation' }, true);
    }

    async delete() {
        return this._request('DELETE', null, { 'Prefer': 'return=representation' }, true);
    }

    async _execute() {
        return this._request('GET', null, {}, false);
    }

    // Common request handler
    async _request(method, body, extraHeaders = {}, useFilters = false) {
        try {
            const headers = { ...(await this._getHeaders()), ...extraHeaders };
            let url = `${this.baseURL}/${this.table}`;

            if (method === 'GET') {
                url += this._buildQueryString();
            } else if (useFilters && this.query.filters.length > 0) {
                url += '?' + this.query.filters.join('&');
            }

            const response = await fetch(url, {
                method,
                headers,
                ...(body && { body: JSON.stringify(body) })
            });

            const isJson = response.headers.get('content-type')?.includes('application/json');
            const result = isJson ? await response.json() : null;

            if (!response.ok) {
                throw new Error(result?.message || `${method} operation failed`);
            }

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    _buildQueryString() {
        const params = [];
        
        if (this.query.select !== '*') params.push(`select=${encodeURIComponent(this.query.select)}`);
        if (this.query.filters.length > 0) params.push(...this.query.filters);
        if (this.query.order) params.push(`order=${this.query.order}`);
        if (this.query.limit) params.push(`limit=${this.query.limit}`);
        
        return params.length > 0 ? '?' + params.join('&') : '';
    }

    then(resolve, reject) {
        return this._execute().then(resolve, reject);
    }

    async _getHeaders() {
        const token = this.auth.currentSession?.access_token || this.key;
        return {
            'Content-Type': 'application/json',
            'apikey': this.key,
            'Authorization': `Bearer ${token}`
        };
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
        return this._authRequest('/token?grant_type=password', { email, password }, 'SIGNED_IN');
    }

    async signUp({ email, password }) {
        return this._authRequest('/signup', { email, password }, 'SIGNED_IN');
    }

    // Common auth request handler
    async _authRequest(endpoint, payload, event) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.key,
                    'Authorization': `Bearer ${this.key}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error_description || data.msg || 'Authentication failed');
            }

            // Handle different response formats
            const sessionData = data.session || (data.access_token ? data : null);
            
            if (sessionData?.access_token) {
                const session = {
                    access_token: sessionData.access_token,
                    refresh_token: sessionData.refresh_token,
                    expires_in: sessionData.expires_in,
                    expires_at: Math.floor(Date.now() / 1000) + sessionData.expires_in,
                    user: data.user
                };

                await this._storeSession(session);
                this.currentSession = session;
                this._notifyListeners(event, session);

                return { data: { session, user: data.user }, error: null };
            }

            // Email confirmation case
            return { data: { user: data.user, session: null }, error: null };
        } catch (error) {
            return { data: { user: null, session: null }, error };
        }
    }

    async signOut() {
        try {
            // Try server logout, but don't fail if it doesn't work
            if (this.currentSession) {
                fetch(`${this.baseURL}/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': this.key,
                        'Authorization': `Bearer ${this.currentSession.access_token}`
                    }
                }).catch(() => {}); // Ignore errors
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
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) this.listeners.splice(index, 1);
        };
    }

    // Storage helpers using Promises
    _getStoredSession() {
        return new Promise(resolve => {
            chrome.storage.local.get(['supabase_session'], result => {
                resolve(result.supabase_session || null);
            });
        });
    }

    _storeSession(session) {
        return new Promise(resolve => {
            chrome.storage.local.set({ supabase_session: session }, resolve);
        });
    }

    _removeStoredSession() {
        return new Promise(resolve => {
            chrome.storage.local.remove(['supabase_session'], resolve);
        });
    }

    _isValidSession(session) {
        return session?.expires_at && Math.floor(Date.now() / 1000) < session.expires_at;
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

// Global supabase object
window.supabase = {
    createClient: (url, key) => new SupabaseClient(url, key)
};
