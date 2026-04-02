# FMCSA Safety Dashboard — Test Workflows & Edge Cases

## Setup Workflows

### W1: Set Company Type via Admin or Edit Form
1. Go to **Companies** page → click Edit on a company
2. Set **Company Type** to "Asset" or "Hybrid"
3. Enter a valid **USDOT Number** (digits only, e.g., `1234567`)
4. Optionally enter an **MC Number** (e.g., `MC-987654`)
5. Save → verify the table now shows the Type badge and DOT# column
6. **Expected**: Asset badge = blue, Broker = purple, Hybrid = indigo

### W2: Set Company Type to Broker
1. Edit a company → set type = "Broker"
2. **Expected**: DOT number is **not required** (brokers may not have one)
3. FMCSA Safety Dashboard will not show data for broker-only companies

---

## CompanySafety Dashboard Workflows

### W3: View Safety Dashboard — Happy Path
1. Navigate to **Safety Compliance → FMCSA Safety**
2. **Expected**: Dashboard loads with FMCSA federal data (left panel) + internal compliance (right panel)
3. Verify: Safety rating badge, authority status, fleet size, OOS rates with national averages, crash data, insurance filings
4. Verify: Internal metrics show driver CDL/medical/MVR percentages, vehicle statuses, trip completion rates, maintenance health

### W4: Refresh FMCSA Data
1. On CompanySafety page, click **"Refresh FMCSA Data"** button
2. **Expected**: Spinner on button → data refreshes from FMCSA QCMobile API → page reloads with new snapshot
3. **Edge case**: If FMCSA API is down or rate-limited, show error alert

### W5: No DOT Number Set
1. Ensure no companies have a DOT number configured
2. Navigate to FMCSA Safety page
3. **Expected**: Yellow warning banner: "No company with DOT number found or company not set as asset/hybrid type"
4. Instructions to set DOT number shown

### W6: No FMCSA Data Yet (First Visit)
1. Set a DOT number on a company but don't trigger a refresh
2. Navigate to FMCSA Safety page
3. **Expected**: "No FMCSA data available yet. Click Refresh FMCSA Data to fetch."
4. Click refresh → data appears

### W7: No Internal Compliance Data Yet
1. New company with no drivers, trucks, or trips
2. **Expected**: Compliance section shows "No internal compliance metrics computed yet. Data is generated nightly."

---

## Carrier Safety Workflows

### W8: View Carrier FMCSA Data — Happy Path
1. Go to **Carriers** page → click on a carrier with a DOT number
2. EditCarrier modal opens → scroll to bottom
3. **Expected**: FMCSA Safety Data section visible (only if carrier has `dot_number`)
4. Shows: safety rating, authority status, fleet size, OOS rates, crashes, insurance

### W9: Carrier Without DOT Number
1. Click on a carrier that has no `dot_number` set
2. **Expected**: FMCSA Safety section is **hidden** (not rendered)
3. No errors

### W10: Carrier with DOT but No FMCSA Data
1. Carrier has a DOT number but FMCSA data hasn't been fetched
2. **Expected**: Shows "No FMCSA data available" with a "Fetch from FMCSA" button
3. Click button → data loads into the section

### W11: Refresh Carrier FMCSA Data
1. In EditCarrier modal, FMCSA section → click "Refresh"
2. **Expected**: Fresh data from FMCSA API loaded inline

---

## AddCompany / EditCompany Form Workflows

### W12: Add Company — Asset Type Validation
1. Click Add Company → select "Asset-Based" type
2. Leave DOT number blank → click Save
3. **Expected**: Validation error: "USDOT number is required for asset-based and hybrid companies"
4. Enter non-numeric DOT (e.g., "ABC")
5. **Expected**: Validation error: "USDOT number must contain only digits"

### W13: Add Company — Broker Type
1. Select "Freight Broker" type
2. Leave DOT blank → click Save
3. **Expected**: **No DOT validation error** (brokers don't require DOT)

### W14: Edit Company — Change Type from Broker to Asset
1. Edit a broker company → change type to "Asset"
2. Save without entering DOT
3. **Expected**: Validation error requiring DOT number

### W15: Edit Company — Pre-population
1. Edit a company that already has type/DOT/MC set
2. **Expected**: All three fields pre-populated with current values
3. Modify and save → changes persisted

---

## Companies Table Workflows

### W16: Search by DOT Number
1. On Companies page, type a DOT number in search box
2. **Expected**: Companies matching that DOT number appear
3. Also searchable by MC number

### W17: Company Type Badge Display
1. View Companies table
2. **Expected**: New "Type" column shows colored badges (Asset=blue, Broker=purple, Hybrid=indigo)
3. Companies without type set show "—"

### W18: DOT# / MC# Column
1. View Companies table
2. **Expected**: "DOT# / MC#" column shows DOT as primary, MC as secondary text
3. Companies without DOT show "—"

---

## Edge Cases

### E1: Invalid DOT Number from FMCSA
- A valid DOT format but FMCSA returns no carrier data
- **Expected**: Error message displayed, no snapshot created

### E2: FMCSA API Key Not Configured
- `FMCSA_API_KEY` env var is empty/missing  
- **Expected**: Backend returns 500 or appropriate error, frontend shows refresh error

### E3: FMCSA API Rate Limiting
- Rapid repeated "Refresh" clicks
- **Expected**: Backend should handle gracefully, possibly throttle. Button disabled during refresh.

### E4: Company with Multiple FMCSA Snapshots
- Nightly cron has created multiple snapshots over time
- **Expected**: Dashboard always shows the **latest** snapshot (ordered by fetched_at desc)

### E5: User Assigned to Multiple Companies
- User has access to 3 companies, 2 with DOT numbers  
- **Expected**: CompanySafety page shows data for the first company with DOT. Future: add company selector.

### E6: Token Expiration During Refresh
- JWT expires while FMCSA refresh is in progress
- **Expected**: `refreshAccessToken()` fires automatically, request retries

### E7: Concurrent EditCarrier + Safety Refresh
- User edits carrier fields while FMCSA section is loading
- **Expected**: No interference — CarrierSafety is a self-contained component with its own state

### E8: Carrier Safety Rating Change
- Carrier's FMCSA safety rating changes from Satisfactory → Conditional
- **Expected**: After next refresh, new rating badge displayed. Consider adding notification/alert.

### E9: Very Long Legal Name / DBA from FMCSA
- FMCSA returns a 200+ character legal name
- **Expected**: Text truncated with `truncate` CSS class in carrier safety panel

### E10: Zero Values in Compliance Metrics
- New company with 0 drivers, 0 trucks, 0 trips
- **Expected**: Percentage fields show "—" (null), not "NaN%" or "0/0"

### E11: OOS Rate Above National Average
- Vehicle OOS rate = 35% (national avg = 20.72%)
- **Expected**: Red color + red progress bar, clearly flagging the issue

### E12: Decimal OOS Rates
- Rate values like 5.51 or 20.72 from FMCSA
- **Expected**: Displayed with 1 decimal place, not rounded to integer

### E13: Insurance Amount Formatting
- BIPD amount = 1000000.00
- **Expected**: Displayed as "$1,000,000" not "1000000.00"

### E14: Multi-Tenant Isolation
- User from Tenant A should NOT see Company B's safety data (Tenant B)
- **Expected**: CompanyFilterMixin ensures data isolation. Verify by logging in as two different tenant users.

---

## Nightly Task Workflows

### W19: Celery Beat — Nightly FMCSA Fetch
- Task: `fetch_all_fmcsa_data` runs at 2:00 AM
- Queries all companies with DOT + all active carriers with DOT
- **Expected**: New FMCSASnapshot records created for each

### W20: Celery Beat — Nightly Compliance Metrics
- Task: `compute_all_compliance_metrics` runs at 3:00 AM
- Computes metrics for all active companies
- **Expected**: New ComplianceMetric records with current period data

### W21: Celery Not Running
- If Redis/Celery is down, nightly tasks don't execute
- **Expected**: Dashboard shows stale data with "Last fetched" timestamp. Manual refresh still works.
