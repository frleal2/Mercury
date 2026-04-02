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
    logger.info("Fetching FMCSA data for DOT %s from %s", dot_number, url)

    try:
        resp = requests.get(url, params=params, timeout=30, headers={'Accept': 'application/json'})
        logger.info("FMCSA response status %s for DOT %s", resp.status_code, dot_number)
        resp.raise_for_status()
    except requests.RequestException as exc:
        logger.error("FMCSA API request failed for DOT %s: %s", dot_number, exc)
        return None

    try:
        data = resp.json()
    except ValueError:
        logger.error("FMCSA API returned non-JSON response for DOT %s: %s", dot_number, resp.text[:200])
        return None

    logger.info("FMCSA response keys for DOT %s: %s", dot_number, list(data.keys()))

    # The FMCSA API may nest carrier under content.carrier or content[0].carrier
    content = data.get('content')
    logger.info("FMCSA content type for DOT %s: %s", dot_number, type(content).__name__)
    if isinstance(content, list) and len(content) > 0:
        content = content[0]
    if not isinstance(content, dict):
        content = {}
    carrier = content.get('carrier', {})
    if not carrier:
        logger.warning("No carrier data returned for DOT %s. Content keys: %s, Full response: %.500s", dot_number, list(content.keys()) if isinstance(content, dict) else 'N/A', str(data)[:500])
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

    # Safely extract nested dicts (FMCSA may return None, int, or dict for any of these)
    oos = carrier.get('oosRateCarrier')
    oos = oos if isinstance(oos, dict) else {}
    crash_total = carrier.get('crashTotal')
    crash_total = crash_total if isinstance(crash_total, dict) else {}
    carrier_op = carrier.get('carrierOperation')
    carrier_op = carrier_op if isinstance(carrier_op, dict) else {}

    # FMCSA sometimes returns crashTotal as a plain int (total count)
    # and individual crash fields at the carrier level
    total_crashes_fallback = _safe_int(carrier.get('crashTotal'), 0)

    return {
        'legal_name': carrier.get('legalName', ''),
        'dba_name': carrier.get('dbaName', ''),
        'entity_type': carrier_op.get('carrierOperationDesc', ''),
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
        # Crashes — handle both nested dict and flat int formats
        'fatal_crashes': _safe_int(crash_total.get('fatalCrash') if crash_total else carrier.get('fatalCrash'), 0),
        'injury_crashes': _safe_int(crash_total.get('injCrash') if crash_total else carrier.get('injCrash'), 0),
        'towaway_crashes': _safe_int(crash_total.get('towawayCrash') if crash_total else carrier.get('towawayCrash'), 0),
        'total_crashes': _safe_int(crash_total.get('totalCrash'), 0) if crash_total else total_crashes_fallback,
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
