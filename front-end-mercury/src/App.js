import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Drivers from './Pages/Drivers';
import React from 'react';
import Login from './Pages/Login';
import { useSession, SessionProvider } from './providers/SessionProvider';
import Companies from './Pages/Companies';
import Trailers from './Pages/Trailers';
import Trucks from './Pages/Trucks';
import Trips from './Pages/Trips';
import DriverDashboard from './Pages/DriverDashboard';
import Recruitment from './Pages/Recruitment';
import ApplicationForm from './Pages/ApplicationForm';
import Maintenance from './Pages/Maintenance';
import UserManagement from './Pages/UserManagement';
import Signup from './Pages/Signup';
import AcceptInvitation from './Pages/AcceptInvitation';
import LandingPage from './Pages/LandingPage';
import Settings from './Pages/Settings';

function AppContent() {
    const { session } = useSession();
    const isLoggedIn = !!session.accessToken;

    return (
        <Routes>
            {isLoggedIn ? (
                <>
                    <Route path="/" element={<><Header /><Drivers /></>} />
                    <Route path="/ActiveDrivers" element={<><Header /><Drivers /></>} />
                    <Route path="/ActiveCompanies" element={<><Header /><Companies /></>} />
                    <Route path="/ActiveTrailers" element={<><Header /><Trailers /></>} />
                    <Route path="/ActiveTrucks" element={<><Header /><Trucks /></>} />
                    <Route path="/Trips" element={<><Header /><Trips /></>} />
                    <Route path="/DriverDashboard" element={<><Header /><DriverDashboard /></>} />
                    <Route path="/Maintenance" element={<><Header /><Maintenance /></>} />
                    <Route path="/Recruitment" element={<><Header /><Recruitment /></>} /> {/* Added Recruitment route */}
                    <Route path="/UserManagement" element={<><Header /><UserManagement /></>} /> {/* Added User Management route */}
                    <Route path="/Settings" element={<><Header /><Settings /></>} /> {/* Added Settings route */}
                    <Route path="/QuickApply" element={<ApplicationForm />} /> {/* Allow access to Recruitment without login */}
                </>
            ) : (
                <>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
                    <Route path="/QuickApply" element={<ApplicationForm />} /> {/* Allow access to Recruitment without login */}
                    <Route path="*" element={<Navigate to="/" />} />
                </>
            )}
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter basename={process.env.PUBLIC_URL || '/'}>
            <SessionProvider>
                <AppContent />
            </SessionProvider>
        </BrowserRouter>
    );
}
