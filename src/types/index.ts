export interface GeocodingResult {
  name?: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  status: 'OK' | 'NOT_FOUND' | 'ERROR';
  provider: string;
}

export interface GeocodingService {
  geocode(address: string): Promise<GeocodingResult>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Config {
  default_service: string;
  rate_limits: Record<string, number>;
  max_batch_size: number;
  cache_duration: number;
}
