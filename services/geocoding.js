import fetch from 'node-fetch';

export class GeocodingManager {
  constructor(config) {
    this.config = config;
    this.services = {
      nominatim: this.nominatimGeocode.bind(this)
    };
  }

  getAvailableServices() {
    return Object.keys(this.services);
  }

  async geocode(address, serviceName = null) {
    const service = serviceName || this.config.default_service;
    
    if (!this.services[service]) {
      throw new Error(`Unknown service: ${service}`);
    }

    return await this.services[service](address);
  }

  async nominatimGeocode(address) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      if (!data || data.length === 0) {
        return {
          lat: null,
          lon: null,
          status: 'NOT_FOUND',
          provider: 'nominatim'
        };
      }

      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
        status: 'OK',
        provider: 'nominatim'
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        lat: null,
        lon: null,
        status: 'ERROR',
        provider: 'nominatim'
      };
    }
  }
}
