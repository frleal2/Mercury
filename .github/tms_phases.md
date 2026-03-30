# TMS Implementation Phases

## Deployment
- Hosted on **Render** (backend + frontend)
- Production auto-redeploys on every push to `origin/main`

## Phase 1 — Core TMS ✅ COMPLETE
- [x] 1. Load/Order Management
- [x] 2. Customer/Shipper Management
- [x] 3. Rate Management & Quoting
- [x] 4. Carrier Management
- [x] 5. Billing & Invoicing
- [x] 6. Dispatch Board

## Phase 2 — Operational Efficiency (IN PROGRESS)
- [x] 7. Document Management (BOL/POD) — commits c314165, da5cd01 (S3 presigned URL fix)
- [ ] 8. Tracking & Visibility
- [ ] 9. Accounting Integration
- [ ] 10. Reporting & Analytics

## Phase 3 — Competitive Differentiators
- [ ] 11. Load Board Integration
- [ ] 12. IFTA & Fuel Tax Reporting
- [ ] 13. Claims Management
- [ ] 14. Automated Notifications & Communication
- [ ] 15. Accessorial & Detention Tracking

Phase 1 — Core TMS (Build First)
1. Load/Order Management (the heartbeat of any TMS)
Load model: shipper, consignee, pickup/delivery locations, commodity, weight, dimensions, equipment type, temperature requirements, reference numbers (PO#, BOL#)
Load statuses: quoted → booked → dispatched → in_transit → delivered → invoiced → paid
Multi-stop loads (LTL support)
You already have Trips — a Load would sit above a Trip. A Load gets created from a customer order, then a Trip is dispatched to fulfill it.
2. Customer/Shipper Management
Customer model: company name, billing address, contacts, payment terms (Net 30/60/90), credit limit, default accessorials
Customer contracts with lane-specific rates
This is distinct from your current Company model (which represents your tenant's own companies). Customers are external entities shipping freight.
3. Rate Management & Quoting
Rate/Quote model: origin/destination (city, state, zip), equipment type, base rate, fuel surcharge, accessorial charges, total, expiration
Lane-based rate sheets (contracted rates per customer per lane)
Spot quoting workflow
Margin/markup calculations (carrier cost vs. customer rate)
4. Carrier Management (critical for brokers)
Carrier model: MC#, DOT#, insurance (auto/cargo/general liability with expiration dates), W-9, authority status, payment terms
Carrier onboarding packet (collect insurance certs, W-9, carrier agreement)
Carrier scorecard: on-time %, claims ratio, responsiveness
For your carrier/fleet users, they are the carrier — but brokers need to manage external carriers they dispatch loads to.
5. Billing & Invoicing
Invoice model: linked to Load, line items (linehaul, fuel surcharge, detention, accessorials), payment terms, status (draft/sent/paid/overdue)
CarrierPayable model: what you owe carriers, linked to Load
Auto-generate invoices from completed loads
Aging reports (AR/AP)
6. Dispatch Board
Visual board showing today's loads, driver/carrier assignments, status
Drag-and-drop assignment of drivers or carriers to loads
You already have trip assignment logic — this extends it with a dedicated UI
Phase 2 — Operational Efficiency
7. Document Management (BOL/POD)
You already have TripDocument — extend it with document types that are TMS-specific: Rate Confirmation, Bill of Lading, Proof of Delivery, Carrier Packet, Lumper Receipt
E-signature for rate confirmations
POD capture (driver uploads photo of signed BOL at delivery)
8. Tracking & Visibility
Check Calls: scheduled status update requests to driver/carrier (location, ETA)
Automated tracking integration (ELD/GPS providers like Samsara, KeepTruckin/Motive)
Customer Portal: read-only load tracking for shippers (your customers)
Automated email/SMS notifications at milestones (picked up, in transit, delivered)
9. Accounting Integration
QuickBooks Online API integration (sync invoices, payments, carrier bills)
Revenue and expense tracking per load
Factoring company integration (for carriers who factor their receivables)
10. Reporting & Analytics
Profit per load, profit per mile
Lane analysis (most/least profitable lanes)
Carrier performance reports
Customer revenue reports
Driver performance (on-time, miles, revenue generated)
You already have a dashboard — extend it with TMS-specific KPIs
Phase 3 — Competitive Differentiators
11. Load Board Integration
Post available loads to DAT, Truckstop.com, or your own internal board
Search available carriers/trucks on load boards
API-based (DAT Power API, Truckstop API)
12. IFTA & Fuel Tax Reporting
Track miles per state/jurisdiction from trip data
You already track mileage on trips — extend to track state-by-state miles
Fuel purchase tracking, IFTA quarterly report generation
13. Claims Management
Claim model: linked to Load, type (cargo damage, shortage, loss), amount, status, carrier liability
Document uploads (photos, inspection reports)
Resolution tracking
14. Automated Notifications & Communication
In-app notification system
Email/SMS for: load tenders, appointment reminders, document requests, payment confirmations, compliance expirations
You already have email for invitations/password reset — extend the infrastructure
15. Accessorial & Detention Tracking
Detention time tracking (driver waiting at shipper/consignee)
Accessorial charges: liftgate, inside delivery, residential, hazmat, layover
Auto-add to invoices