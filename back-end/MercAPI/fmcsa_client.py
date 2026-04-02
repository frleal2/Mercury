"""
FMCSA QCMobile API client.
Fetches carrier/company safety data from the federal FMCSA database
and stores it as FMCSASnapshot records.

API docs: https://mobile.fmcsa.dot.gov/QCDevsite/
Requires a free Webkey from FMCSA registration.
"""
import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

FMCSA_BASE_URL = "https://mobile.fmcsa.dot.gov/qc/services"


def _safe_decimal(value, default=None):
    """Convert a value to Decimal safely, returning default on failure."""
    if value is None or value == '':
        return default
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return default


def _safe_int(value, default=None):
    """Convert a value to int safely."""
    if value is None or value == '':
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _parse_date(value):
    """Parse FMCSA date string (various formats) to a date object."""
    from datetime import datetime
    if not value:
        return None
    for fmt in ('%m/%d/%Y', '%Y-%m-%d', '%d-%b-%Y'):
        try:
            return datetime.strptime(str(value).strip(), fmt).date()
        except ValueError:
            continue
    return None


def fetch_carrier_data(dot_number):
    """
    Fetch carrier basics from the FMCSA QCMobile API.
    Returns parsed dict or None on failure.
    """
    api_key = getattr(settings, 'FMCSA_API_KEY', '')
    if not api_key:
        logger.warning("FMCSA_API_KEY not configured — skipping fetch for DOT %s", dot_number)
        return None

    url = f"{FMCSA_BASE_URL}/carriers/{dot_number}"
    params = {'webKey': api_key}

    try:
        resp = requests.get(url, params=params, timeout=30)
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.error("FMCSA API request failed for DOT %s: %s", dot_number, exc)
        return None

    data = resp.json()
    content = data.get('content', {})
    carrier = content.get('carrier', {})
    if not carrier:
        logger.warning("No carrier data returned for DOT %s", dot_number)
        return None

    return _parse_carrier_response(carrier, data)


def _parse_carrier_response(carrier, raw_response):
    """Parse FMCSA carrier JSON into a flat dict matching FMCSASnapshot fields."""
    # Authority status
    allowed_to_operate = carrier.get('allowedToOperate', '')
    if allowed_to_operate == 'Y':
        authority_status = 'active'
    elif allowed_to_operate == 'N':
        authority_status = 'inactive'
    else:
        authority_status = 'not_authorized'

    # Safety rating
    safety_rating_raw = (carrier.get('safetyRating') or '').upper()
    safety_map = {
        'SATISFACTORY': 'satisfactory',
        'CONDITIONAL': 'conditional',
        'UNSATISFACTORY': 'unsatisfactory',
    }
    safety_rating = safety_map.get(safety_rating_raw, 'not_rated')

    # OOS rates
    oos = carrier.get('oosRateCarrier', {}) or {}

    return {
        'legal_name': carrier.get('legalName', ''),
        'dba_name': carrier.get('dbaName', ''),
        'entity_type': carrier.get('carrierOperation', {}).get('carrierOperationDesc', ''),
        'phy_city': carrier.get('phyCity', ''),
        'phy_state': carrier.get('phyState', ''),
        'authority_status': authority_status,
        'common_authority': carrier.get('commonAuthorityStatus', '') == 'A',
        'contract_authority': carrier.get('contractAuthorityStatus', '') == 'A',
        'broker_authority': carrier.get('brokerAuthorityStatus', '') == 'A',
        'safety_rating': safety_rating,
        'safety_rating_date': _parse_date(carrier.get('safetyRatingDate')),
        # Insurance from FMCSA filings
        'bipd_insurance_on_file': carrier.get('bipdInsuranceOnFile', 'N') == 'Y',
        'bipd_insurance_amount': _safe_decimal(carrier.get('bipdInsuranceRequired')),
        'cargo_insurance_on_file': carrier.get('cargoInsuranceOnFile', 'N') == 'Y',
        'cargo_insurance_amount': _safe_decimal(carrier.get('cargoInsuranceRequired')),
        'bond_surety_on_file': carrier.get('bondInsuranceOnFile', 'N') == 'Y',
        # Fleet
        'total_power_units': _safe_int(carrier.get('totalPowerUnits')),
        'total_drivers': _safe_int(carrier.get('totalDrivers')),
        # OOS rates
        'vehicle_oos_rate': _safe_decimal(oos.get('vehicleOosRate')),
        'driver_oos_rate': _safe_decimal(oos.get('driverOosRate')),
        'hazmat_oos_rate': _safe_decimal(oos.get('hazmatOosRate')),
        'vehicle_inspections_count': _safe_int(oos.get('vehicleInsp')),
        'driver_inspections_count': _safe_int(oos.get('driverInsp')),
        # Crashes
        'fatal_crashes': _safe_int(carrier.get('crashTotal', {}).get('fatalCrash'), 0),
        'injury_crashes': _safe_int(carrier.get('crashTotal', {}).get('injCrash'), 0),
        'towaway_crashes': _safe_int(carrier.get('crashTotal', {}).get('towawayCrash'), 0),
        'total_crashes': _safe_int(carrier.get('crashTotal', {}).get('totalCrash'), 0),
        # Meta
        'raw_response': raw_response,
    }


def fetch_and_store(dot_number, company=None, carrier=None):
    """
    Fetch FMCSA data for a DOT number and create an FMCSASnapshot.
    Pass either company or carrier (not both).
    Returns the snapshot or None on failure.
    """
    from MercAPI.models import FMCSASnapshot

    parsed = fetch_carrier_data(dot_number)
    if parsed is None:
        return None

    snapshot = FMCSASnapshot.objects.create(
        company=company,
        carrier=carrier,
        dot_number=dot_number,
        data_as_of=timezone.now().date(),
        **{k: v for k, v in parsed.items() if k != 'raw_response'},
        raw_response=parsed.get('raw_response', {}),
    )
    logger.info("Stored FMCSA snapshot for DOT %s (id=%d)", dot_number, snapshot.pk)

    # If carrier, sync safety_rating back to Carrier model
    if carrier and parsed.get('safety_rating') != 'not_rated':
        carrier.safety_rating = parsed['safety_rating']
        carrier.save(update_fields=['safety_rating', 'updated_at'])

    return snapshot


def get_latest_snapshot(dot_number=None, company=None, carrier=None):
    """Return the most recent FMCSASnapshot for a company or carrier."""
    from MercAPI.models import FMCSASnapshot

    qs = FMCSASnapshot.objects.all()
    if company:
        qs = qs.filter(company=company)
    elif carrier:
        qs = qs.filter(carrier=carrier)
    elif dot_number:
        qs = qs.filter(dot_number=dot_number)
    else:
        return None
    return qs.first()  # ordered by -fetched_at
