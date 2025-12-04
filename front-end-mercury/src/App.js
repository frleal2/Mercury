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
import Dashboard from './Pages/Dashboard';
import Recruitment from './Pages/Recruitment';
import ApplicationForm from './Pages/ApplicationForm';
import Maintenance from './Pages/Maintenance';
import UserManagement from './Pages/UserManagement';
import Signup from './Pages/Signup';
import AcceptInvitation from './Pages/AcceptInvitation';
import ForgotPassword from './Pages/ForgotPassword';
import ResetPassword from './Pages/ResetPassword';
import LandingPage from './Pages/LandingPage';
import Settings from './Pages/Settings';
import VehicleCompliancePage from './Pages/VehicleCompliancePage';
import DVIRReviewPage from './Pages/DVIRReviewPage';
import InspectorQualificationPage from './Pages/InspectorQualificationPage';
import AnnualInspectionPage from './Pages/AnnualInspectionPage';

function AppContent() {
    const { session } = useSession();
    const isLoggedIn = !!session.accessToken;
    const userRole = session?.userInfo?.role || 'user';

    return (
        <Routes>
            {isLoggedIn ? (
                <>
                    {/* Routes based on user role */}
                    {userRole === 'driver' ? (
                        // Driver-specific routes
                        <>
                            <Route path="/" element={<><Header /><DriverDashboard /></>} />
                            <Route path="/DriverDashboard" element={<><Header /><DriverDashboard /></>} />
                            <Route path="/Settings" element={<><Header /><Settings /></>} />
                            {/* Redirect drivers trying to access admin pages */}
                            <Route path="/Trips" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="/ActiveDrivers" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="/ActiveCompanies" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="/ActiveTrailers" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="/ActiveTrucks" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="/Maintenance" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="/Recruitment" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="/UserManagement" element={<Navigate to="/DriverDashboard" />} />
                            <Route path="*" element={<Navigate to="/DriverDashboard" />} />
                        </>
                    ) : (
                        // Admin/Manager routes
                        <>
                            <Route path="/" element={<><Header /><Dashboard /></>} />
                            <Route path="/Dashboard" element={<><Header /><Dashboard /></>} />
                            <Route path="/ActiveDrivers" element={<><Header /><Drivers /></>} />
                            <Route path="/ActiveCompanies" element={<><Header /><Companies /></>} />
                            <Route path="/ActiveTrailers" element={<><Header /><Trailers /></>} />
                            <Route path="/ActiveTrucks" element={<><Header /><Trucks /></>} />
                            <Route path="/Trips" element={<><Header /><Trips /></>} />
                            <Route path="/DriverDashboard" element={<><Header /><DriverDashboard /></>} />
                            <Route path="/Maintenance" element={<><Header /><Maintenance /></>} />
                            <Route path="/Recruitment" element={<><Header /><Recruitment /></>} />
                            <Route path="/UserManagement" element={<><Header /><UserManagement /></>} />
                            <Route path="/VehicleCompliance" element={<><Header /><VehicleCompliancePage /></>} />
                            <Route path="/DVIRReview" element={<><Header /><DVIRReviewPage /></>} />
                            <Route path="/InspectorQualification" element={<><Header /><InspectorQualificationPage /></>} />
                            <Route path="/AnnualInspection" element={<><Header /><AnnualInspectionPage /></>} />
                            <Route path="/Settings" element={<><Header /><Settings /></>} />
                        </>
                    )}
                    <Route path="/QuickApply" element={<ApplicationForm />} /> {/* Allow access to Recruitment without login */}
                </>
            ) : (
                <>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password/:token" element={<ResetPassword />} />
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
