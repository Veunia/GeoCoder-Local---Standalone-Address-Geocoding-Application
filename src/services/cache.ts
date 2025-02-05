import NodeCache from 'node-cache';
import { CacheService } from '../types';

export class MemoryCache implements CacheService {
  private cache: NodeCache;

  constructor(ttlSeconds: number = 86400) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key) || null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    this.cache.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    this.cache.del(key);
  }
}
