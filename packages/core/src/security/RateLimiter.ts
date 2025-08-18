/**
 * Professional rate limiter with multiple algorithms and monitoring
 * Protects against DoS attacks and API abuse
 */

import { createLogger, ILogger } from '../logging/index.js';
import { RateLimitError } from '../errors/index.js';
import { RateLimitConfig } from '../config/index.js';

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number; // seconds
}

/**
 * Rate limit entry for tracking requests
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastRequest: number;
}

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  activeKeys: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/**
 * Rate limit key (can be IP, user ID, API key hash, etc.)
 */
export type RateLimitKey = string;

/**
 * Rate limiter algorithm types
 */
export enum RateLimitAlgorithm {
  TOKEN_BUCKET = 'token_bucket',
  SLIDING_WINDOW = 'sliding_window',
  FIXED_WINDOW = 'fixed_window',
}

/**
 * Professional rate limiter with multiple algorithms
 */
export class RateLimiter {
  private readonly logger: ILogger;
  private readonly entries = new Map<RateLimitKey, RateLimitEntry>();
  private readonly algorithm: RateLimitAlgorithm;
  private totalRequests = 0;
  private blockedRequests = 0;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private readonly config: RateLimitConfig,
    algorithm: RateLimitAlgorithm = RateLimitAlgorithm.SLIDING_WINDOW
  ) {
    this.logger = createLogger('RateLimiter');
    this.algorithm = algorithm;

    // Start cleanup interval to prevent memory leaks
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.windowSizeMs / 2);

    this.logger.info('Rate limiter initialized', {
      algorithm,
      requestsPerMinute: config.requestsPerMinute,
      burstLimit: config.burstLimit,
      windowSizeMs: config.windowSizeMs,
    });
  }

  /**
   * Check if request is allowed under rate limits
   */
  public checkLimit(key: RateLimitKey): RateLimitResult {
    if (!this.config.enabled) {
      return {
        allowed: true,
        remaining: this.config.requestsPerMinute,
        resetTime: new Date(Date.now() + this.config.windowSizeMs),
      };
    }

    this.totalRequests++;

    switch (this.algorithm) {
      case RateLimitAlgorithm.TOKEN_BUCKET:
        return this.checkTokenBucket(key);
      case RateLimitAlgorithm.SLIDING_WINDOW:
        return this.checkSlidingWindow(key);
      case RateLimitAlgorithm.FIXED_WINDOW:
        return this.checkFixedWindow(key);
      default:
        throw new Error(`Unknown rate limit algorithm: ${this.algorithm}`);
    }
  }

  /**
   * Check and consume rate limit, throwing error if exceeded
   */
  public async consume(key: RateLimitKey): Promise<void> {
    const result = this.checkLimit(key);
    
    if (!result.allowed) {
      this.blockedRequests++;
      this.logger.warn('Rate limit exceeded', {
        key: this.sanitizeKey(key),
        retryAfter: result.retryAfter,
        remaining: result.remaining,
      });

      throw new RateLimitError(
        `Rate limit exceeded for ${this.sanitizeKey(key)}`,
        result.retryAfter || 60,
        'api_requests',
        {
          key: this.sanitizeKey(key),
          remaining: result.remaining,
          resetTime: result.resetTime,
        }
      );
    }

    this.logger.debug('Rate limit check passed', {
      key: this.sanitizeKey(key),
      remaining: result.remaining,
      resetTime: result.resetTime,
    });
  }

  /**
   * Get remaining requests for a key
   */
  public getRemaining(key: RateLimitKey): number {
    const result = this.checkLimit(key);
    return result.remaining;
  }

  /**
   * Reset rate limit for a key
   */
  public reset(key: RateLimitKey): void {
    this.entries.delete(key);
    this.logger.debug('Rate limit reset', { key: this.sanitizeKey(key) });
  }

  /**
   * Reset all rate limits
   */
  public resetAll(): void {
    this.entries.clear();
    this.totalRequests = 0;
    this.blockedRequests = 0;
    this.logger.info('All rate limits reset');
  }

  /**
   * Get rate limiter statistics
   */
  public getStats(): RateLimitStats {
    const entries = Array.from(this.entries.values());
    const timestamps = entries.map(entry => entry.lastRequest);
    
    return {
      totalRequests: this.totalRequests,
      blockedRequests: this.blockedRequests,
      activeKeys: this.entries.size,
      oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
      newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
    };
  }

  /**
   * Cleanup expired entries to prevent memory leaks
   */
  public cleanup(): void {
    const now = Date.now();
    const expiredKeys: RateLimitKey[] = [];
    
    for (const [key, entry] of this.entries) {
      // Remove entries older than window size
      if (now - entry.lastRequest > this.config.windowSizeMs) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.entries.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.logger.debug('Rate limiter cleanup completed', {
        removedEntries: expiredKeys.length,
        activeEntries: this.entries.size,
      });
    }
  }

  /**
   * Shutdown rate limiter and cleanup resources
   */
  public shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.entries.clear();
    this.logger.info('Rate limiter shutdown completed');
  }

  /**
   * Token bucket algorithm implementation
   */
  private checkTokenBucket(key: RateLimitKey): RateLimitResult {
    const now = Date.now();
    const entry = this.entries.get(key) || {
      count: this.config.burstLimit, // Start with full bucket
      windowStart: now,
      lastRequest: now,
    };

    // Calculate tokens to add based on time passed
    const timePassed = now - entry.lastRequest;
    const tokensToAdd = Math.floor((timePassed / this.config.windowSizeMs) * this.config.requestsPerMinute);
    
    // Refill bucket but don't exceed burst limit
    entry.count = Math.min(this.config.burstLimit, entry.count + tokensToAdd);
    entry.lastRequest = now;

    if (entry.count > 0) {
      entry.count--;
      this.entries.set(key, entry);
      
      return {
        allowed: true,
        remaining: entry.count,
        resetTime: new Date(now + ((this.config.burstLimit - entry.count) * this.config.windowSizeMs) / this.config.requestsPerMinute),
      };
    } else {
      const retryAfter = Math.ceil(this.config.windowSizeMs / this.config.requestsPerMinute / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime: new Date(now + retryAfter * 1000),
        retryAfter,
      };
    }
  }

  /**
   * Sliding window algorithm implementation
   */
  private checkSlidingWindow(key: RateLimitKey): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowSizeMs;
    
    const entry = this.entries.get(key) || {
      count: 0,
      windowStart: now,
      lastRequest: 0,
    };

    // Reset if outside current window
    if (entry.windowStart < windowStart) {
      entry.count = 0;
      entry.windowStart = windowStart;
    }

    if (entry.count < this.config.requestsPerMinute) {
      entry.count++;
      entry.lastRequest = now;
      this.entries.set(key, entry);

      return {
        allowed: true,
        remaining: this.config.requestsPerMinute - entry.count,
        resetTime: new Date(entry.windowStart + this.config.windowSizeMs),
      };
    } else {
      const resetTime = new Date(entry.windowStart + this.config.windowSizeMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }
  }

  /**
   * Fixed window algorithm implementation
   */
  private checkFixedWindow(key: RateLimitKey): RateLimitResult {
    const now = Date.now();
    const windowStart = Math.floor(now / this.config.windowSizeMs) * this.config.windowSizeMs;
    
    const entry = this.entries.get(key) || {
      count: 0,
      windowStart,
      lastRequest: 0,
    };

    // Reset count if we're in a new window
    if (entry.windowStart !== windowStart) {
      entry.count = 0;
      entry.windowStart = windowStart;
    }

    if (entry.count < this.config.requestsPerMinute) {
      entry.count++;
      entry.lastRequest = now;
      this.entries.set(key, entry);

      return {
        allowed: true,
        remaining: this.config.requestsPerMinute - entry.count,
        resetTime: new Date(windowStart + this.config.windowSizeMs),
      };
    } else {
      const resetTime = new Date(windowStart + this.config.windowSizeMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }
  }

  /**
   * Sanitize key for logging (remove sensitive information)
   */
  private sanitizeKey(key: RateLimitKey): string {
    // Hash long keys or keys that might contain sensitive info
    if (key.length > 20) {
      return `${key.slice(0, 8)}...${key.slice(-4)}`;
    }
    return key;
  }
}