# Fleetly Fleet Management System - AI Coding Instructions

## Architecture Overview

Fleetly is a multi-tenant fleet management SaaS with Django REST Framework backend and React frontend.

### Project Structure
- **Backend**: `back-end/MercAPI/` - Django project with single app architecture (legacy naming)
- **Frontend**: `front-end-mercury/` - Create React App with Tailwind CSS and Headless UI (legacy naming)
- **Database**: SQLite for development, PostgreSQL for production via `dj_database_url`

*Note: Repository and folder names use "Mercury" (legacy), but the actual application brand is "Fleetly"*

## Multi-Tenant Architecture

### Tenant Hierarchy (Critical for Data Isolation)
- **Tenant** → **Company** → **Drivers/Trucks/Trailers**
- Each `Tenant` has unique `domain` (subdomain) and `application_code` (for Quick Apply links)
- `UserProfile` model links users to tenants and companies with role-based access
- `CompanyFilterMixin` in views.py ensures users only see data from their assigned companies

### Key Technical Patterns

### Backend (Django)
- **Single App Pattern**: All models, views, and serializers in `MercAPI/` directory
- **ViewSets with Company Filtering**: Use `CompanyFilterMixin` to auto-filter by user's companies
- **Nested Serializers**: Driver model includes nested `tests` relationship (DriverTestSerializer)
- **JWT Authentication**: Custom tokens include `tenant_id`, `tenant_name`, `companies[]` in payload
- **Invitation System**: `InvitationToken` model with UUID tokens for secure user registration

### Frontend (React)
- **Session Management**: `SessionProvider` decodes JWT to extract `tenantId`, `companies[]`, `isCompanyAdmin`
- **Tenant-Aware Routing**: `/accept-invitation/:token` for user onboarding with tenant assignment
- **Modal Components**: Consistent pattern using state flags (e.g., `isAddDriverOpen`, `isEditDriverOpen`)
- **API Configuration**: Environment-aware config via `config.js` (local vs render endpoints)
### Component Structure**: 
  - `Pages/` for route components (Drivers, Companies, Trips, Maintenance, etc.)
  - `components/` for reusable UI (Add/Edit modals, Header navigation, Inspections)

### Data Models Hierarchy (Multi-Tenant)
- **Tenant** (1:many) **Company** (1:many) **Driver** (1:many) **DriverTest**
- **Company** (1:many) **Truck/Trailer** (1:many) **Trips** (with pre/post inspections)
- **Driver** (1:many) **DriverHOS** (Hours of Service)
- **Trips** (1:many) **TripInspection** + **TripDocument** (Bills of Lading, receipts, photos)
- **DriverApplication** (tenant-aware recruitment with `company` FK)
- **MaintenanceRecord** (polymorphic: trucks OR trailers with extensive categorization)
- **UserProfile** (links User to Tenant + Companies with role permissions)

## Development Workflows

### Backend Development (PowerShell)
```powershell
cd back-end
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### Frontend Development (PowerShell)
```powershell
cd front-end-mercury
npm install
npm start  # Runs on localhost:3000
```

### Production Deployment
- Backend uses `build.sh` script for Render deployment with `CREATE_SUPERUSER` env var
- Frontend uses `static.json` for SPA routing with `_redirects` for client-side routing
- Environment variables for API URLs managed via `config.js` (`REACT_APP_ENV`, `REACT_APP_LOCAL_API_URL`, `REACT_APP_RENDER_API_URL`)

## Component Patterns

### Modal Components
Follow the pattern in `AddDriver.js` and `AddTrip.js`:
- State management for form data with `useState`
- Company fetching in `useEffect` for dropdowns
- Axios requests with Bearer token authentication
- `onClose` prop for parent state updates
- Auto-assignment logic (e.g., driver → truck → trailer in trips)
- Form validation with error state management

### Data Fetching
Standard pattern across pages:
```javascript
const { session, refreshAccessToken } = useSession();
const response = await axios.get(`${BASE_URL}/api/endpoint/`, {
  headers: { 'Authorization': `Bearer ${session.accessToken}` }
});
```

### Tenant Isolation Pattern
All viewsets inherit from `CompanyFilterMixin` which automatically filters data by user's assigned companies:
```python
class CompanyFilterMixin:
    def get_queryset(self):
        if not hasattr(self.request.user, 'profile'):
            return queryset.none()
        user_companies = self.request.user.profile.companies.all()
        return queryset.filter(company__in=user_companies)
```

### Navigation Structure
Header component uses Headless UI with dropdown menus. Main sections:
- Safety Compliance (Companies, Drivers, Trucks, Trailers)
- Operations (Trips with pre/post-trip inspections)
- Maintenance (Equipment service records)
- Recruitment (separate module with QuickApply)

## Special Considerations

### Authentication
- Public route: `/QuickApply` (recruitment form accessible without login)
- JWT tokens with refresh mechanism in `SessionProvider`
- All API endpoints require authentication except registration/login

### User Onboarding
- Invitation-based registration via `/accept-invitation/:token`
- `InvitationToken` model with 7-day expiration and single-use validation
- Users auto-assigned to inviter's tenant and company upon registration

### Styling
- Tailwind CSS for utility-first styling
- Headless UI for accessible components
- Custom gray-800 theme for navigation
- Responsive design patterns throughout

### API Design
- RESTful endpoints following DRF conventions
- Nested data serialization (drivers include test history)
- Custom endpoints like `/api/DriverTest/<driver_id>/` for specific queries

### Recent Additions (2025)
- **Trip Management**: Full CRUD operations with status tracking (scheduled/in_progress/completed/cancelled)
- **Trip Inspections**: Pre-trip and post-trip safety checks with detailed checklists
- **Trip Documents**: File uploads for Bills of Lading, receipts, and photos
- **Auto-Assignment Logic**: Driver selection auto-assigns associated truck and trailer
- **Enhanced Trailers**: Added `unit_number` (unique) and `trailer_type` fields

When adding new features, follow these established patterns for consistency with the existing codebase.