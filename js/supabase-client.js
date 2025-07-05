/**
 * A simplified Supabase client for Chrome extensions.
 */
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.auth = new SupabaseAuth(url, key);
    }

    /**
     * Creates a query builder for a specific table.
     * @param {string} table - The name of the table.
     * @returns {SupabaseQueryBuilder}
     */
    from(table) {
        return new SupabaseQueryBuilder(this.url, this.key, table, this.auth);
    }
}

/**
 * Builds and executes queries against a Supabase table.
 */
class SupabaseQueryBuilder {
    constructor(url, key, table, auth) {
        this.url = url;
        this.key = key;
        this.table = table;
        this.auth = auth;
        this.baseURL = `${url}/rest/v1`;
        this.query = { select: '*', filters: [], order: null, limit: null };
    }

    /**
     * Specifies the columns to select.
     * @param {string} columns - The columns to select.
     * @returns {this}
     */
    select(columns = '*') {
        this.query.select = columns;
        return this;
    }

    // Filter methods
    eq(col, val) { return this._addFilter(col, 'eq', val); }
    neq(col, val) { return this._addFilter(col, 'neq', val); }
    gt(col, val) { return this._addFilter(col, 'gt', val); }
    gte(col, val) { return this._addFilter(col, 'gte', val); }
    lt(col, val) { return this._addFilter(col, 'lt', val); }
    lte(col, val) { return this._addFilter(col, 'lte', val); }
    like(col, pat) { return this._addFilter(col, 'like', pat); }
    ilike(col, pat) { return this._addFilter(col, 'ilike', pat); }

    _addFilter(column, operator, value) {
        this.query.filters.push(`${column}=${operator}.${encodeURIComponent(value)}`);
        return this;
    }

    in(column, values) {
        this.query.filters.push(`${column}=in.(${values.map(encodeURIComponent).join(',')})`);
        return this;
    }

    order(column, { ascending = true } = {}) {
        this.query.order = `${column}.${ascending ? 'asc' : 'desc'}`;
        return this;
    }

    limit(count) {
        this.query.limit = count;
        return this;
    }

    // CRUD operations
    async insert(data) { return this._request('POST', data, { 'Prefer': 'return=representation' }); }
    async update(data) { return this._request('PATCH', data, { 'Prefer': 'return=representation' }, true); }
    async delete() { return this._request('DELETE', null, { 'Prefer': 'return=representation' }, true); }
    async _execute() { return this._request('GET'); }

    /**
     * Handles HTTP requests to the Supabase API.
     */
    async _request(method, body, extraHeaders = {}, useFilters = false) {
        try {
            const headers = { ...(await this._getHeaders()), ...extraHeaders };
            let url = `${this.baseURL}/${this.table}`;

            if (method === 'GET') {
                url += this._buildQueryString();
            } else if (useFilters && this.query.filters.length > 0) {
                url += `?${this.query.filters.join('&')}`;
            }

            const response = await fetch(url, { method, headers, ...(body && { body: JSON.stringify(body) }) });
            const result = response.headers.get('content-type')?.includes('application/json') ? await response.json() : null;

            if (!response.ok) throw new Error(result?.message || 'Request failed');
            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    _buildQueryString() {
        const params = new URLSearchParams();
        if (this.query.select !== '*') params.append('select', this.query.select);
        this.query.filters.forEach(f => params.append(f.split('=')[0], f.split('=')[1]));
        if (this.query.order) params.append('order', this.query.order);
        if (this.query.limit) params.append('limit', this.query.limit);
        return `?${params}`;
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

/**
 * Manages authentication with Supabase.
 */
class SupabaseAuth {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.baseURL = `${url}/auth/v1`;
        this.listeners = new Set();
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

    signInWithPassword({ email, password }) { return this._authRequest('/token?grant_type=password', { email, password }, 'SIGNED_IN'); }
    signUp({ email, password }) { return this._authRequest('/signup', { email, password }, 'SIGNED_IN'); }

    async _authRequest(endpoint, payload, event) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'apikey': this.key, 'Authorization': `Bearer ${this.key}` },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error_description || data.msg || 'Authentication failed');

            const sessionData = data.session || (data.access_token ? data : null);
            if (sessionData?.access_token) {
                const session = { ...sessionData, expires_at: Math.floor(Date.now() / 1000) + sessionData.expires_in, user: data.user };
                await this._storeSession(session);
                this.currentSession = session;
                this._notifyListeners(event, session);
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
                fetch(`${this.baseURL}/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': this.key, 'Authorization': `Bearer ${this.currentSession.access_token}` }
                }).catch(() => {});
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
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Storage helpers
    _getStoredSession() { return new Promise(resolve => chrome.storage.local.get('supabase_session', r => resolve(r.supabase_session))); }
    _storeSession(session) { return new Promise(resolve => chrome.storage.local.set({ supabase_session: session }, resolve)); }
    _removeStoredSession() { return new Promise(resolve => chrome.storage.local.remove('supabase_session', resolve)); }

    _isValidSession(session) { return session?.expires_at && Date.now() / 1000 < session.expires_at; }

    _notifyListeners(event, session) {
        setTimeout(() => this.listeners.forEach(cb => cb(event, session)), 0);
    }
}

// Exposes a global Supabase client factory.
window.supabase = {
    createClient: (url, key) => new SupabaseClient(url, key)
};
