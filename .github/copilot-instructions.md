# Mercury Fleet Management System - AI Coding Instructions

## Architecture Overview

Mercury is a full-stack fleet management application with Django REST Framework backend and React frontend.

### Project Structure
- **Backend**: `back-end/MercAPI/` - Django project with single app architecture
- **Frontend**: `front-end-mercury/` - Create React App with Tailwind CSS and Headless UI
- **Database**: SQLite for development, PostgreSQL for production via `dj_database_url`

## Key Technical Patterns

### Backend (Django)
- **Single App Pattern**: All models, views, and serializers in `MercAPI/` directory
- **ViewSets**: Use DRF ModelViewSets (see `views.py`) for CRUD operations
- **Nested Serializers**: Driver model includes nested `tests` relationship (DriverTestSerializer)
- **Authentication**: JWT tokens via `rest_framework_simplejwt` with custom `CustomTokenObtainPairView`
- **CORS Configuration**: Explicit origins in `settings.py` and `deployment_settings.py`

### Frontend (React)
- **Session Management**: Custom `SessionProvider` with localStorage persistence and auto-refresh
- **Routing Pattern**: Protected routes wrap components with `<Header />` component
- **Modal Components**: Consistent pattern using state flags (e.g., `isAddDriverOpen`, `isEditDriverOpen`)
- **API Configuration**: Environment-aware config via `config.js` (local vs render endpoints)
- **Component Structure**: 
  - `Pages/` for route components (Drivers, Companies, etc.)
  - `components/` for reusable UI (Add/Edit modals, Header navigation)

### Data Models Hierarchy
- **Company** (1:many) **Driver** (1:many) **DriverTest**
- **Company** (1:many) **Truck**
- **Company** (1:many) **Trailer**
- **Driver** (1:many) **DriverHOS** (Hours of Service)
- **DriverApplication** (standalone recruitment model)

## Development Workflows

### Backend Development
```bash
cd back-end
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

### Frontend Development
```bash
cd front-end-mercury
npm install
npm start  # Runs on localhost:3000
```

### Production Deployment
- Backend uses `build.sh` script for Render deployment
- Frontend uses `static.json` for SPA routing
- Environment variables for API URLs managed via `config.js`

## Component Patterns

### Modal Components
Follow the pattern in `AddDriver.js`:
- State management for form data with `useState`
- Company fetching in `useEffect` for dropdowns
- Axios requests with Bearer token authentication
- `onClose` prop for parent state updates

### Data Fetching
Standard pattern across pages:
```javascript
const { session, refreshAccessToken } = useSession();
const response = await axios.get(`${BASE_URL}/api/endpoint/`, {
  headers: { 'Authorization': `Bearer ${session.accessToken}` }
});
```

### Navigation Structure
Header component uses Headless UI with dropdown menus. Main sections:
- Safety Compliance (Companies, Drivers, Trucks, Trailers)
- Recruitment (separate module)

## Special Considerations

### Authentication
- Public route: `/QuickApply` (recruitment form accessible without login)
- JWT tokens with refresh mechanism in `SessionProvider`
- All API endpoints require authentication except registration/login

### Styling
- Tailwind CSS for utility-first styling
- Headless UI for accessible components
- Custom gray-800 theme for navigation
- Responsive design patterns throughout

### API Design
- RESTful endpoints following DRF conventions
- Nested data serialization (drivers include test history)
- Custom endpoints like `/api/DriverTest/<driver_id>/` for specific queries

When adding new features, follow these established patterns for consistency with the existing codebase.