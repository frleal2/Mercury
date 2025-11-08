import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';
import MercuryLogoBlack from '../images/fleetlyBackgroundRemoved.png'; // Corrected path for the logo

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // Added success state
    const navigate = useNavigate();
    const location = useLocation();
    const { setSession } = useSession();

    useEffect(() => {
        // Check if there's a success message from navigation state
        if (location.state?.message) {
            setSuccess(location.state.message);
            if (location.state.email) {
                setUsername(location.state.email);
            }
        }
    }, [location.state]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess(''); // Clear success message

        try {
            const response = await axios.post(`${BASE_URL}/api/token/`, { // Corrected endpoint
                username,
                password,
            });
            const { access, refresh } = response.data;
            setSession({ accessToken: access, refreshToken: refresh });
            setSuccess('Login was successful!'); // Set success message
            navigate('/ActiveDrivers'); // Redirect to ActiveDrivers page
        } catch (err) {
            console.error('Login error:', err.response || err); // Log the full error response
            setError(err.response?.data?.detail || 'Login failed');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
                <div className="flex justify-center mb-4"> {/* Reduced margin */}
                    <img src={MercuryLogoBlack} alt="Mercury Logo" className="h-32" /> {/* Slightly increased height */}
                </div>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    {success && <p className="text-green-500 text-sm mb-4">{success}</p>} {/* Display success message */}
                    <button
                        type="submit"
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-200"
                    >
                        Login
                    </button>
                </form>
                
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <button
                            onClick={() => navigate('/signup')}
                            className="font-medium text-blue-600 hover:text-blue-500"
                        >
                            Sign up for free
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
