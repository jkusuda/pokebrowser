import { CONFIG } from '../shared/config.js';

/**
 * Security validation utilities for protecting against abuse
 */
export class SecurityValidator {
    
    /**
     * Validates Pokemon data before database operations
     */
    static validatePokemonData(pokemon) {
        const errors = [];

        // Basic required fields
        if (!pokemon.id || !Number.isInteger(pokemon.id) || pokemon.id < 1 || pokemon.id > 1010) {
            errors.push('Invalid Pokemon ID');
        }

        if (!pokemon.name || typeof pokemon.name !== 'string' || pokemon.name.length > 50) {
            errors.push('Invalid Pokemon name');
        }

        if (!pokemon.site || typeof pokemon.site !== 'string' || pokemon.site.length > 200) {
            errors.push('Invalid site URL');
        }

        // Validate timestamps
        const caughtAt = new Date(pokemon.caughtAt);
        if (isNaN(caughtAt.getTime()) || caughtAt > new Date()) {
            errors.push('Invalid caught date');
        }

        // Validate level if present
        if (pokemon.level !== undefined && (!Number.isInteger(pokemon.level) || pokemon.level < 1 || pokemon.level > 100)) {
            errors.push('Invalid Pokemon level');
        }

        // Validate boolean fields
        if (pokemon.shiny !== undefined && typeof pokemon.shiny !== 'boolean') {
            errors.push('Invalid shiny flag');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validates candy operations
     */
    static validateCandyOperation(pokemonId, amount) {
        const errors = [];

        if (!pokemonId || !Number.isInteger(pokemonId) || pokemonId < 1 || pokemonId > 1010) {
            errors.push('Invalid Pokemon ID for candy operation');
        }

        if (!Number.isInteger(amount) || amount < 0 || amount > 1000) {
            errors.push('Invalid candy amount (must be 0-1000)');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validates batch operations to prevent abuse
     */
    static validateBatchSize(items) {
        if (!Array.isArray(items)) {
            return {
                isValid: false,
                errors: ['Batch data must be an array']
            };
        }

        if (items.length > CONFIG.MAX_BATCH_SIZE) {
            return {
                isValid: false,
                errors: [`Batch size too large (max ${CONFIG.MAX_BATCH_SIZE})`]
            };
        }

        return {
            isValid: true,
            errors: []
        };
    }

    /**
     * Rate limiting check (simple client-side implementation)
     */
    static checkRateLimit(operation, userId = 'anonymous') {
        if (!CONFIG.RATE_LIMITING) {
            return { allowed: true };
        }

        const key = `rate_limit_${operation}_${userId}`;
        const now = Date.now();
        
        // Get stored rate limit data
        const stored = localStorage.getItem(key);
        let rateLimitData = stored ? JSON.parse(stored) : { count: 0, windowStart: now };

        // Check if we're in a new time window (1 minute)
        const windowDuration = 60000; // 1 minute
        if (now - rateLimitData.windowStart > windowDuration) {
            rateLimitData = { count: 0, windowStart: now };
        }

        // Define rate limits per operation
        const limits = {
            'sync': 10,
            'catch_pokemon': 50,
            'evolve': 20,
            'release': 30,
            'candy_operation': 100
        };

        const limit = limits[operation] || 30; // Default limit

        if (rateLimitData.count >= limit) {
            return {
                allowed: false,
                error: `Rate limit exceeded for ${operation}. Try again later.`,
                retryAfter: windowDuration - (now - rateLimitData.windowStart)
            };
        }

        // Increment and store
        rateLimitData.count++;
        localStorage.setItem(key, JSON.stringify(rateLimitData));

        return { allowed: true };
    }

    /**
     * Sanitizes data before sending to database
     */
    static sanitizeForDatabase(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            // Remove any keys that might be injection attempts
            if (key.includes('__') || key.includes('$') || key.includes('..')) {
                console.warn(`Skipping potentially malicious key: ${key}`);
                continue;
            }

            // Sanitize string values
            if (typeof value === 'string') {
                sanitized[key] = value.trim().substring(0, 1000); // Limit string length
            } else if (typeof value === 'number') {
                sanitized[key] = Number.isFinite(value) ? value : 0;
            } else if (typeof value === 'boolean') {
                sanitized[key] = value;
            } else if (value instanceof Date) {
                sanitized[key] = value.toISOString();
            } else if (Array.isArray(value)) {
                sanitized[key] = value.slice(0, 100); // Limit array size
            } else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeForDatabase(value); // Recursive
            }
        }

        return sanitized;
    }

    /**
     * Validates user permissions for operations
     */
    static validateUserPermissions(operation, userData) {
        // For now, basic checks - can be expanded based on user roles
        
        const permissions = {
            'create_pokemon': true,
            'update_pokemon': true,
            'delete_pokemon': true,
            'manage_candies': true,
            'view_history': true
        };

        return {
            allowed: permissions[operation] !== false,
            error: !permissions[operation] ? `Permission denied for ${operation}` : null
        };
    }

    /**
     * Comprehensive security check wrapper
     */
    static async validateRequest(operation, data, user = null) {
        const validationResults = [];

        // Rate limiting check
        if (CONFIG.RATE_LIMITING) {
            const rateLimitResult = this.checkRateLimit(operation, user?.id);
            if (!rateLimitResult.allowed) {
                return {
                    valid: false,
                    error: rateLimitResult.error,
                    retryAfter: rateLimitResult.retryAfter
                };
            }
        }

        // Data validation
        if (operation === 'catch_pokemon' && data) {
            const pokemonValidation = this.validatePokemonData(data);
            if (!pokemonValidation.isValid) {
                return {
                    valid: false,
                    error: `Invalid Pokemon data: ${pokemonValidation.errors.join(', ')}`
                };
            }
        }

        if (operation === 'candy_operation' && data) {
            const candyValidation = this.validateCandyOperation(data.pokemonId, data.amount);
            if (!candyValidation.isValid) {
                return {
                    valid: false,
                    error: `Invalid candy operation: ${candyValidation.errors.join(', ')}`
                };
            }
        }

        if (Array.isArray(data)) {
            const batchValidation = this.validateBatchSize(data);
            if (!batchValidation.isValid) {
                return {
                    valid: false,
                    error: `Batch validation failed: ${batchValidation.errors.join(', ')}`
                };
            }
        }

        // User permissions
        const permissionResult = this.validateUserPermissions(operation, user);
        if (!permissionResult.allowed) {
            return {
                valid: false,
                error: permissionResult.error
            };
        }

        return {
            valid: true,
            sanitizedData: this.sanitizeForDatabase(data)
        };
    }
}
