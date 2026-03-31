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
                        Fleet Management & TMS <span className="text-blue-600">All-in-One</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                        From driver management and DOT compliance to load dispatching, invoicing, and real-time 
                        shipment tracking — run your entire trucking operation from a single platform.
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

            {/* Fleet Management Features */}
            <section className="px-4 py-16 bg-white">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full mb-4">FLEET MANAGEMENT</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                            Keep Your Fleet Safe & Compliant
                        </h2>
                    </div>
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
                            <div className="text-4xl mb-4">🛣️</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Trip Management</h3>
                            <p className="text-gray-600">
                                Plan and track trips with pre-trip and post-trip inspections, 
                                document uploads, and full status lifecycle management.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-red-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">🛡️</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Safety & Compliance</h3>
                            <p className="text-gray-600">
                                CFR 396 annual inspections, vehicle operation status tracking, 
                                qualified inspector management, and audit-ready reports.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-teal-50 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Recruitment Tools</h3>
                            <p className="text-gray-600">
                                Streamline driver recruitment with Quick Apply links, digital applications, 
                                and automated screening processes.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* TMS Features */}
            <section className="px-4 py-16 bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="inline-block px-4 py-1 bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-full mb-4">TRANSPORTATION MANAGEMENT</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                            A Complete TMS Built for Your Business
                        </h2>
                        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
                            Manage loads from quote to payment — dispatch, track, and invoice with full visibility across your operation.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center p-6 rounded-lg bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">📦</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Load Management</h3>
                            <p className="text-gray-600">
                                Full load lifecycle from quote to delivery. Multi-stop support, 
                                equipment types, temperature requirements, and rate calculations.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">📋</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Dispatch Board</h3>
                            <p className="text-gray-600">
                                Visual dispatch board to assign drivers and carriers to loads. 
                                Drag-and-drop scheduling with real-time status tracking.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">🤝</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Customers & Carriers</h3>
                            <p className="text-gray-600">
                                Manage shippers with payment terms and credit limits. Track carrier 
                                MC#, DOT#, insurance, and performance scorecards.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">💰</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Billing & Invoicing</h3>
                            <p className="text-gray-600">
                                Auto-generate invoices from delivered loads with line items, fuel 
                                surcharges, accessorials, and integrated payment tracking.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">📄</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Document Management</h3>
                            <p className="text-gray-600">
                                Upload and manage BOLs, proof of delivery, rate confirmations, 
                                and lumper receipts — all securely stored in the cloud.
                            </p>
                        </div>
                        <div className="text-center p-6 rounded-lg bg-white border border-gray-100 hover:shadow-lg transition-shadow">
                            <div className="text-4xl mb-4">📍</div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Shipment Tracking</h3>
                            <p className="text-gray-600">
                                Real-time check calls, milestone email notifications, and a public 
                                tracking portal so your customers always know where their freight is.
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
                        Ready to Run Your Fleet & Freight Smarter?
                    </h2>
                    <p className="text-lg md:text-xl mb-8 opacity-90">
                        From compliance and maintenance to dispatching and invoicing — Fleetly gives you 
                        everything in one platform. Start your free trial today, no credit card required.
                    </p>
                    <div className="flex justify-center">
                        <button 
                            onClick={() => navigate('/signup')}
                            className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg"
                        >
                            Start Free Trial
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
                        <span>© 2026 Fleetly. All rights reserved.</span>
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