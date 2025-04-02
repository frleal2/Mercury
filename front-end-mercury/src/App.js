import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Drivers from './Pages/Drivers';
import InactiveDrivers from './Pages/InactiveDrivers';
import ActiveCompanies from './Pages/ActiveCompanies';
import React from 'react';
import Home from './Pages/Home';
import Login from './Pages/Login';
import { useSession, SessionProvider } from './providers/SessionProvider';

function AppContent() {
    const { session } = useSession();
    const isLoggedIn = !!session.accessToken;

    return (
        <Routes>
            {isLoggedIn ? (
                <>
                    <Route path="/" element={<><Header /><Home /></>} />
                    <Route path="/ActiveDrivers" element={<><Header /><Drivers /></>} />
                    <Route path="/InactiveDrivers" element={<><Header /><InactiveDrivers /></>} />
                    <Route path="/ActiveCompanies" element={<><Header /><ActiveCompanies /></>} />
                </>
            ) : (
                <>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" />} />
                </>
            )}
        </Routes>
    );
}

export default function App() {
    return (
        <SessionProvider>
            <BrowserRouter>
                <AppContent />
            </BrowserRouter>
        </SessionProvider>
    );
}
