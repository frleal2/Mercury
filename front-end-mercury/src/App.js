import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Drivers from './Pages/Drivers';
import React from 'react';
import Login from './Pages/Login';
import { useSession, SessionProvider } from './providers/SessionProvider';
import Companies from './Pages/Companies';
import Trailers from './Pages/Trailers';
import Trucks from './Pages/Trucks';

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
