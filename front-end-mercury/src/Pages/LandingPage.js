import React from 'react';
import { useNavigate } from 'react-router-dom';
import FleetlyLogo from '../images/fleetlyBackgroundRemoved.png';
import FleetlyWhiteLogo from '../images/fleetlyWhite.png';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Navigation */}
            <nav className="relative px-4 py-4 flex justify-between items-center bg-white shadow-sm">
                <div className="flex items-center">
                    <span className="text-2xl font-bold text-blue-600">Fleetly</span>
                </div>
                <div className="hidden md:flex space-x-4">
                    <button 
                        onClick={() => navigate('/login')}
                        className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        Log In
                    </button>
                    <button 
                        onClick={() => navigate('/signup')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                        Sign Up
                    </button>
                </div>
                {/* Mobile menu button */}
                <div className="md:hidden">
                    <button 
                        onClick={() => navigate('/login')}
                        className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                        Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="px-4 py-20 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="flex justify-center mb-8">
                        <img src={FleetlyLogo} alt="Fleetly Logo" className="h-48 md:h-64 w-auto" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                        Streamline Your <span className="text-blue-600">Fleet Operations</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        Manage drivers, vehicles, maintenance, and compliance all in one powerful platform. 
                        Keep your fleet running smoothly with real-time insights and automated workflows.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button 
                            onClick={() => navigate('/signup')}
                            className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
                        >
                            Get Started Free
                        </button>
                        <button 
                            onClick={() => navigate('/login')}
                            className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-50 border-2 border-blue-600 transition-colors"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="px-4 py-16 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
                        Everything You Need to Manage Your Fleet
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-6 rounded-lg bg-blue-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">👥</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Driver Management</h3>
                            <p className="text-gray-600">
                                Track driver credentials, licenses, test results, and hours of service. 
                                Ensure compliance with DOT regulations effortlessly.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-green-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">🚛</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Vehicle Tracking</h3>
                            <p className="text-gray-600">
                                Monitor trucks and trailers, track maintenance schedules, and keep 
                                detailed inspection records for optimal fleet performance.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-purple-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">🔧</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Maintenance Hub</h3>
                            <p className="text-gray-600">
                                Schedule preventive maintenance, track repairs, and manage work orders. 
                                Keep your fleet running with automated reminders.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-orange-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Compliance Reports</h3>
                            <p className="text-gray-600">
                                Generate DOT compliance reports, track safety metrics, and maintain 
                                audit-ready documentation with ease.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-red-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Recruitment Tools</h3>
                            <p className="text-gray-600">
                                Streamline driver recruitment with digital applications, document 
                                management, and automated screening processes.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-teal-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">☁️</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Cloud-Based</h3>
                            <p className="text-gray-600">
                                Access your fleet data anywhere, anytime. Secure cloud storage with 
                                real-time synchronization across all devices.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="px-4 py-16 bg-gray-900 text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-12">
                        Trusted by Fleet Managers Everywhere
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">99.9%</div>
                            <div className="text-lg text-gray-300">Uptime Reliability</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">24/7</div>
                            <div className="text-lg text-gray-300">Support Available</div>
                        </div>
                        <div>
                            <div className="text-4xl md:text-5xl font-bold text-purple-400 mb-2">SOC 2</div>
                            <div className="text-lg text-gray-300">Compliant & Secure</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="px-4 py-20 bg-blue-600 text-white text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Ready to Transform Your Fleet Management?
                    </h2>
                    <p className="text-lg md:text-xl mb-8 opacity-90">
                        Join hundreds of fleet managers who have streamlined their operations with Fleetly.
                        Start your free trial today – no credit card required.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button 
                            onClick={() => navigate('/signup')}
                            className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
                        >
                            Start Free Trial
                        </button>
                        <button 
                            onClick={() => navigate('/QuickApply')}
                            className="px-8 py-4 bg-transparent text-white text-lg font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-blue-600 transition-colors"
                        >
                            Driver Application
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-4 py-8 bg-gray-800 text-gray-300 text-center">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-center mb-4">
                        <img src={FleetlyWhiteLogo} alt="Fleetly Logo" className="h-10 w-auto" />
                    </div>
                    <p className="mb-4">
                        Streamlining fleet operations with powerful, easy-to-use management tools.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm">
                        <span>© 2025 Fleetly. All rights reserved.</span>
                        <div className="flex gap-4">
                            <a href="mailto:felipe.leal@myfleetly.com" className="hover:text-white transition-colors">
                                Contact
                            </a>
                            <span>•</span>
                            <a href="#" className="hover:text-white transition-colors">
                                Privacy
                            </a>
                            <span>•</span>
                            <a href="#" className="hover:text-white transition-colors">
                                Terms
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;