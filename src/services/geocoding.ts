import axios from 'axios';
import { GeocodingService, GeocodingResult, CacheService } from '../types';

export class NominatimService implements GeocodingService {
  private cache: CacheService;
  private rateLimitMs: number;

  constructor(cache: CacheService, rateLimit: number = 1000) {
    this.cache = cache;
    this.rateLimitMs = rateLimit;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async geocode(address: string): Promise<GeocodingResult> {
    const cacheKey = `geocode:${address}`;
    const cached = await this.cache.get<GeocodingResult>(cacheKey);
    
    if (cached) {
      return cached;
    }

    await this.delay(this.rateLimitMs);

    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search`,
        {
          params: {
            format: 'json',
            q: address,
          },
          headers: {
            'User-Agent': 'GeoCoder-Local/1.0',
          },
        }
      );

      if (!response.data || response.data.length === 0) {
        return {
          address,
          latitude: null,
          longitude: null,
          status: 'NOT_FOUND',
          provider: 'nominatim',
        };
      }

      const result: GeocodingResult = {
        address,
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon),
        status: 'OK',
        provider: 'nominatim',
      };

      await this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        address,
        latitude: null,
        longitude: null,
        status: 'ERROR',
        provider: 'nominatim',
      };
    }
  }
}
