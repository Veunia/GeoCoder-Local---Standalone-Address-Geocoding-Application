import requests
import time
from abc import ABC, abstractmethod
from typing import Dict, Optional

class GeocodingService(ABC):
    @abstractmethod
    def geocode(self, address: str) -> Dict:
        pass

class NominatimService(GeocodingService):
    def __init__(self, rate_limit: float = 1.0):
        self.rate_limit = rate_limit

    def geocode(self, address: str) -> Dict:
        time.sleep(self.rate_limit)
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        headers = {
            "User-Agent": "GeoCoder-Local/1.0"
        }
        
        try:
            response = requests.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            if response.json():
                result = response.json()[0]
                return {
                    "lat": float(result["lat"]),
                    "lon": float(result["lon"]),
                    "status": "success",
                    "provider": "nominatim"
                }
        except Exception as e:
            return {
                "lat": None,
                "lon": None,
                "status": f"error: {str(e)}",
                "provider": "nominatim"
            }
            
        return {
            "lat": None,
            "lon": None,
            "status": "not_found",
            "provider": "nominatim"
        }

class GoogleMapsService(GeocodingService):
    def __init__(self, api_key: str, rate_limit: float = 0.1):
        self.api_key = api_key
        self.rate_limit = rate_limit

    def geocode(self, address: str) -> Dict:
        time.sleep(self.rate_limit)
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": address,
            "key": self.api_key
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data["status"] == "OK":
                location = data["results"][0]["geometry"]["location"]
                return {
                    "lat": location["lat"],
                    "lon": location["lng"],
                    "status": "success",
                    "provider": "google"
                }
            return {
                "lat": None,
                "lon": None,
                "status": f"error: {data['status']}",
                "provider": "google"
            }
        except Exception as e:
            return {
                "lat": None,
                "lon": None,
                "status": f"error: {str(e)}",
                "provider": "google"
            }

class GeocodingManager:
    def __init__(self, config: Dict):
        self.services = {}
        self.default_service = config.get("default_service", "nominatim")
        
        # Initialize Nominatim service
        self.services["nominatim"] = NominatimService(
            rate_limit=config.get("rate_limits", {}).get("nominatim", 1.0)
        )
        
        # Initialize Google Maps service if API key is provided
        google_api_key = config.get("google_api_key")
        if google_api_key:
            self.services["google"] = GoogleMapsService(
                api_key=google_api_key,
                rate_limit=config.get("rate_limits", {}).get("google", 0.1)
            )

    def geocode(self, address: str, service_name: Optional[str] = None) -> Dict:
        service_name = service_name or self.default_service
        service = self.services.get(service_name)
        
        if not service:
            return {
                "lat": None,
                "lon": None,
                "status": "error: invalid_service",
                "provider": service_name
            }
            
        return service.geocode(address)

    def get_available_services(self) -> list:
        return list(self.services.keys())
