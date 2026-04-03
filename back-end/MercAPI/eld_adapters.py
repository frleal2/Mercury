"""
ELD Provider Adapters — Normalize different ELD APIs into a common format.

Each adapter translates a provider's response into standard DTOs that map
to our internal models (VehicleLocation, DriverHOS, etc.).
"""
import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional

import requests

logger = logging.getLogger(__name__)


# ─── Normalized Data Transfer Objects ────────────────────────────────────────

@dataclass
class ELDVehicleDTO:
    external_id: str
    name: str
    vin: str = ''
    make: str = ''
    model: str = ''
    year: Optional[int] = None
    license_plate: str = ''


@dataclass
class ELDDriverDTO:
    external_id: str
    first_name: str
    last_name: str
    username: str = ''
    phone: str = ''
    license_number: str = ''
    license_state: str = ''


@dataclass
class ELDLocationDTO:
    external_vehicle_id: str
    latitude: Decimal
    longitude: Decimal
    speed_mph: Optional[Decimal] = None
    heading: Optional[int] = None
    odometer_miles: Optional[Decimal] = None
    engine_hours: Optional[Decimal] = None
    recorded_at: Optional[datetime] = None
    driver_external_id: Optional[str] = None


@dataclass
class ELDHosLogDTO:
    driver_external_id: str
    duty_status: str  # Will be mapped to OFF/SLEEP/DRIVING/ON_DUTY
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: int = 0
    vehicle_external_id: Optional[str] = None
    notes: str = ''


# ─── Base Adapter ────────────────────────────────────────────────────────────

class BaseELDAdapter(ABC):
    """Abstract base for all ELD provider adapters."""

    def __init__(self, api_key: str, access_token: str = ''):
        self.api_key = api_key
        self.access_token = access_token
        self.session = requests.Session()
        self.session.timeout = 30

    @abstractmethod
    def test_connection(self) -> bool:
        """Verify the API credentials work. Return True if connected."""
        ...

    @abstractmethod
    def fetch_vehicles(self) -> list[ELDVehicleDTO]:
        """Fetch all vehicles from the provider."""
        ...

    @abstractmethod
    def fetch_drivers(self) -> list[ELDDriverDTO]:
        """Fetch all drivers from the provider."""
        ...

    @abstractmethod
    def fetch_vehicle_locations(self) -> list[ELDLocationDTO]:
        """Fetch current GPS positions for all vehicles."""
        ...

    @abstractmethod
    def fetch_hos_logs(self, start_date: str, end_date: str) -> list[ELDHosLogDTO]:
        """Fetch HOS duty status logs for a date range."""
        ...


# ─── Motive (KeepTruckin) Adapter ───────────────────────────────────────────

class MotiveAdapter(BaseELDAdapter):
    """
    Adapter for Motive (formerly KeepTruckin) ELD API.
    Docs: https://developer.gomotive.com/
    """
    BASE_URL = 'https://api.gomotive.com/v1'

    def _headers(self):
        return {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json',
        }

    def test_connection(self) -> bool:
        try:
            resp = self.session.get(
                f'{self.BASE_URL}/users',
                headers=self._headers(),
                params={'per_page': 1},
            )
            return resp.status_code == 200
        except Exception as e:
            logger.error(f'Motive connection test failed: {e}')
            return False

    def fetch_vehicles(self) -> list[ELDVehicleDTO]:
        vehicles = []
        url = f'{self.BASE_URL}/vehicles'
        params = {'per_page': 100}
        try:
            while url:
                resp = self.session.get(url, headers=self._headers(), params=params)
                resp.raise_for_status()
                data = resp.json()
                for v in data.get('vehicles', []):
                    veh = v.get('vehicle', v)
                    vehicles.append(ELDVehicleDTO(
                        external_id=str(veh.get('id', '')),
                        name=veh.get('number', veh.get('name', '')),
                        vin=veh.get('vin', ''),
                        make=veh.get('make', ''),
                        model=veh.get('model', ''),
                        year=veh.get('year'),
                        license_plate=veh.get('license_plate_number', ''),
                    ))
                # Pagination
                pagination = data.get('pagination', {})
                url = pagination.get('next_url')
                params = {}  # next_url already has params
        except Exception as e:
            logger.error(f'Motive fetch_vehicles error: {e}')
        return vehicles

    def fetch_drivers(self) -> list[ELDDriverDTO]:
        drivers = []
        url = f'{self.BASE_URL}/users'
        params = {'per_page': 100, 'role': 'driver'}
        try:
            while url:
                resp = self.session.get(url, headers=self._headers(), params=params)
                resp.raise_for_status()
                data = resp.json()
                for u in data.get('users', []):
                    user = u.get('user', u)
                    drivers.append(ELDDriverDTO(
                        external_id=str(user.get('id', '')),
                        first_name=user.get('first_name', ''),
                        last_name=user.get('last_name', ''),
                        username=user.get('username', ''),
                        phone=user.get('phone', ''),
                        license_number=user.get('drivers_license_number', ''),
                        license_state=user.get('drivers_license_state', ''),
                    ))
                pagination = data.get('pagination', {})
                url = pagination.get('next_url')
                params = {}
        except Exception as e:
            logger.error(f'Motive fetch_drivers error: {e}')
        return drivers

    def fetch_vehicle_locations(self) -> list[ELDLocationDTO]:
        locations = []
        try:
            resp = self.session.get(
                f'{self.BASE_URL}/vehicle_locations',
                headers=self._headers(),
                params={'per_page': 100},
            )
            resp.raise_for_status()
            data = resp.json()
            for item in data.get('vehicle_locations', []):
                vl = item.get('vehicle_location', item)
                loc = vl.get('location', {})
                locations.append(ELDLocationDTO(
                    external_vehicle_id=str(vl.get('vehicle', {}).get('id', '')),
                    latitude=Decimal(str(loc.get('lat', 0))),
                    longitude=Decimal(str(loc.get('lon', 0))),
                    speed_mph=Decimal(str(loc.get('speed_miles_per_hour', 0))) if loc.get('speed_miles_per_hour') else None,
                    heading=loc.get('bearing'),
                    odometer_miles=Decimal(str(vl.get('odometer', 0))) if vl.get('odometer') else None,
                    engine_hours=Decimal(str(vl.get('engine_hours', 0))) if vl.get('engine_hours') else None,
                    recorded_at=datetime.fromisoformat(loc.get('located_at', '').replace('Z', '+00:00')) if loc.get('located_at') else None,
                    driver_external_id=str(vl.get('driver', {}).get('id', '')) if vl.get('driver') else None,
                ))
        except Exception as e:
            logger.error(f'Motive fetch_vehicle_locations error: {e}')
        return locations

    def fetch_hos_logs(self, start_date: str, end_date: str) -> list[ELDHosLogDTO]:
        HOS_MAP = {
            'off_duty': 'OFF', 'sleeper': 'SLEEP',
            'driving': 'DRIVING', 'on_duty': 'ON_DUTY',
            'on_duty_not_driving': 'ON_DUTY',
        }
        logs = []
        try:
            resp = self.session.get(
                f'{self.BASE_URL}/hos_logs',
                headers=self._headers(),
                params={'start_date': start_date, 'end_date': end_date, 'per_page': 100},
            )
            resp.raise_for_status()
            data = resp.json()
            for item in data.get('hos_logs', []):
                log = item.get('hos_log', item)
                raw_status = log.get('status', '').lower()
                logs.append(ELDHosLogDTO(
                    driver_external_id=str(log.get('driver', {}).get('id', '')),
                    duty_status=HOS_MAP.get(raw_status, 'OFF'),
                    start_time=datetime.fromisoformat(log.get('start_time', '').replace('Z', '+00:00')) if log.get('start_time') else None,
                    end_time=datetime.fromisoformat(log.get('end_time', '').replace('Z', '+00:00')) if log.get('end_time') else None,
                    duration_minutes=int(log.get('duration', 0) / 60) if log.get('duration') else 0,
                    vehicle_external_id=str(log.get('vehicle', {}).get('id', '')) if log.get('vehicle') else None,
                    notes=log.get('notes', ''),
                ))
        except Exception as e:
            logger.error(f'Motive fetch_hos_logs error: {e}')
        return logs


# ─── Samsara Adapter ─────────────────────────────────────────────────────────

class SamsaraAdapter(BaseELDAdapter):
    """
    Adapter for Samsara ELD API.
    Docs: https://developers.samsara.com/
    """
    BASE_URL = 'https://api.samsara.com'

    def _headers(self):
        return {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
        }

    def test_connection(self) -> bool:
        try:
            resp = self.session.get(
                f'{self.BASE_URL}/fleet/vehicles',
                headers=self._headers(),
                params={'limit': 1},
            )
            return resp.status_code == 200
        except Exception as e:
            logger.error(f'Samsara connection test failed: {e}')
            return False

    def fetch_vehicles(self) -> list[ELDVehicleDTO]:
        vehicles = []
        try:
            resp = self.session.get(
                f'{self.BASE_URL}/fleet/vehicles',
                headers=self._headers(),
                params={'limit': 512},
            )
            resp.raise_for_status()
            for v in resp.json().get('data', []):
                vehicles.append(ELDVehicleDTO(
                    external_id=str(v.get('id', '')),
                    name=v.get('name', ''),
                    vin=v.get('vin', ''),
                    make=v.get('make', ''),
                    model=v.get('model', ''),
                    year=v.get('year'),
                    license_plate=v.get('licensePlate', ''),
                ))
        except Exception as e:
            logger.error(f'Samsara fetch_vehicles error: {e}')
        return vehicles

    def fetch_drivers(self) -> list[ELDDriverDTO]:
        drivers = []
        try:
            resp = self.session.get(
                f'{self.BASE_URL}/fleet/drivers',
                headers=self._headers(),
                params={'limit': 512},
            )
            resp.raise_for_status()
            for d in resp.json().get('data', []):
                name_parts = d.get('name', '').split(' ', 1)
                drivers.append(ELDDriverDTO(
                    external_id=str(d.get('id', '')),
                    first_name=name_parts[0] if name_parts else '',
                    last_name=name_parts[1] if len(name_parts) > 1 else '',
                    username=d.get('username', ''),
                    phone=d.get('phone', ''),
                    license_number=d.get('licenseNumber', ''),
                    license_state=d.get('licenseState', ''),
                ))
        except Exception as e:
            logger.error(f'Samsara fetch_drivers error: {e}')
        return drivers

    def fetch_vehicle_locations(self) -> list[ELDLocationDTO]:
        locations = []
        try:
            resp = self.session.get(
                f'{self.BASE_URL}/fleet/vehicles/locations',
                headers=self._headers(),
            )
            resp.raise_for_status()
            for item in resp.json().get('data', []):
                loc = item.get('location', {})
                locations.append(ELDLocationDTO(
                    external_vehicle_id=str(item.get('id', '')),
                    latitude=Decimal(str(loc.get('latitude', 0))),
                    longitude=Decimal(str(loc.get('longitude', 0))),
                    speed_mph=Decimal(str(loc.get('speedMilesPerHour', 0))) if loc.get('speedMilesPerHour') else None,
                    heading=loc.get('heading'),
                    recorded_at=datetime.fromisoformat(loc.get('time', '').replace('Z', '+00:00')) if loc.get('time') else None,
                ))
        except Exception as e:
            logger.error(f'Samsara fetch_vehicle_locations error: {e}')
        return locations

    def fetch_hos_logs(self, start_date: str, end_date: str) -> list[ELDHosLogDTO]:
        # Samsara HOS endpoint requires different handling, stub for Phase 3
        return []


# ─── Geotab Adapter (Stub) ──────────────────────────────────────────────────

class GeotabAdapter(BaseELDAdapter):
    """Placeholder for Geotab API integration — Phase 3."""

    def test_connection(self) -> bool:
        return False

    def fetch_vehicles(self) -> list[ELDVehicleDTO]:
        return []

    def fetch_drivers(self) -> list[ELDDriverDTO]:
        return []

    def fetch_vehicle_locations(self) -> list[ELDLocationDTO]:
        return []

    def fetch_hos_logs(self, start_date: str, end_date: str) -> list[ELDHosLogDTO]:
        return []


# ─── Adapter Factory ─────────────────────────────────────────────────────────

def get_adapter(provider_type: str, api_key: str, access_token: str = '') -> BaseELDAdapter:
    adapters = {
        'motive': MotiveAdapter,
        'samsara': SamsaraAdapter,
        'geotab': GeotabAdapter,
    }
    cls = adapters.get(provider_type)
    if not cls:
        raise ValueError(f'Unknown ELD provider: {provider_type}')
    return cls(api_key=api_key, access_token=access_token)
