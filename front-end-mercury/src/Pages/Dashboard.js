import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSession } from '../providers/SessionProvider';
import BASE_URL from '../config';

const Dashboard = () => {
    const { session } = useSession();
    const [dashboardData, setDashboardData] = useState({
        criticalAlerts: [],
        keyMetrics: {},
        complianceScores: {},
        actionItems: {
            drivers: [],
            vehicles: [],
            inspections: [],
            maintenance: []
        },
        recentActivity: [],
        loading: true,
        error: null
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setDashboardData(prev => ({ ...prev, loading: true, error: null }));
            
            console.log('Fetching dashboard data...');
            console.log('Session token:', session.accessToken ? 'Present' : 'Missing');
            
            // Test the basic API first
            try {
                const testResponse = await axios.get(`${BASE_URL}/api/dashboard/test/`, {
                    headers: { 'Authorization': `Bearer ${session.accessToken}` }
                });
                console.log('Test API response:', testResponse.data);
            } catch (testError) {
                console.error('Test API failed:', testError);
            }
            
            // Try simple dashboard first
            const response = await axios.get(`${BASE_URL}/api/dashboard/simple/`, {
                headers: { 'Authorization': `Bearer ${session.accessToken}` }
            });

            console.log('Dashboard API response:', response.data);
            const data = response.data;

            setDashboardData({
                criticalAlerts: data.critical_alerts || [],
                keyMetrics: data.key_metrics || {},
                complianceScores: data.compliance_scores || {},
                actionItems: data.action_items || {
                    drivers: [],
                    vehicles: [],
                    inspections: [],
                    maintenance: []
                },
                recentActivity: data.recent_activity || [],
                loading: false,
                error: null
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            console.error('Error response:', error.response?.data);
            console.error('Error status:', error.response?.status);
            
            let errorMessage = 'Failed to load dashboard data';
            if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setDashboardData(prev => ({
                ...prev,
                loading: false,
                error: errorMessage
            }));
        }
    };

    const AlertCard = ({ alert }) => (
        <div className={`alert-card ${alert.type} ${alert.priority}`}>
            <div className="alert-icon">
                {alert.type === 'error' ? '🚨' : alert.type === 'warning' ? '⚠️' : 'ℹ️'}
            </div>
            <div className="alert-content">
                <h4>{alert.title}</h4>
                <p>{alert.message}</p>
                {alert.date && <span className="alert-date">Due: {new Date(alert.date).toLocaleDateString()}</span>}
            </div>
        </div>
    );

    const MetricCard = ({ title, value, subtitle, trend, color = 'blue' }) => (
        <div className={`metric-card ${color}`}>
            <div className="metric-header">
                <h3>{title}</h3>
                {trend && <span className={`trend ${trend}`}>
                    {trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}
                </span>}
            </div>
            <div className="metric-value">{value}</div>
            {subtitle && <div className="metric-subtitle">{subtitle}</div>}
        </div>
    );

    const ActionItem = ({ item, type }) => (
        <div className="action-item">
            <div className="action-icon">
                {type === 'drivers' ? '👤' : type === 'vehicles' ? '🚛' : type === 'inspections' ? '🔍' : '🔧'}
            </div>
            <div className="action-content">
                <span className="action-title">
                    {type === 'drivers' ? `${item.first_name} ${item.last_name}` : 
                     type === 'vehicles' ? `${item.make} ${item.model} - ${item.unit_number}` :
                     type === 'inspections' ? `Trip ${item.trip_id} - ${item.driver_name}` :
                     type === 'maintenance' ? item.vehicle_info :
                     item.title || item.description}
                </span>
                <span className="action-subtitle">
                    {type === 'drivers' ? 
                        item.action_needed :
                     type === 'vehicles' ? 
                        `Status: ${item.status}` :
                     type === 'inspections' ? 
                        item.issue :
                     type === 'maintenance' ? 
                        `${item.maintenance_type} - ${item.priority}` :
                     item.subtitle}
                </span>
            </div>
        </div>
    );

    if (dashboardData.loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <style>{`
                .dashboard-container {
                    padding: 24px;
                    max-width: 1400px;
                    margin: 0 auto;
                    background: #f8fafc;
                    min-height: 100vh;
                }
                
                .dashboard-header {
                    margin-bottom: 32px;
                }
                
                .dashboard-title {
                    font-size: 32px;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0 0 8px 0;
                }
                
                .dashboard-subtitle {
                    color: #64748b;
                    font-size: 16px;
                    margin: 0;
                }
                
                .section {
                    margin-bottom: 32px;
                }
                
                .section-title {
                    font-size: 20px;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0 0 16px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .alerts-grid {
                    display: grid;
                    gap: 16px;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                }
                
                .alert-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 16px;
                    border-radius: 12px;
                    border-left: 4px solid;
                    background: white;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                
                .alert-card.error {
                    border-left-color: #ef4444;
                    background: #fef2f2;
                }
                
                .alert-card.warning {
                    border-left-color: #f59e0b;
                    background: #fffbeb;
                }
                
                .alert-card.info {
                    border-left-color: #3b82f6;
                    background: #eff6ff;
                }
                
                .alert-icon {
                    font-size: 20px;
                    margin-top: 2px;
                }
                
                .alert-content h4 {
                    margin: 0 0 4px 0;
                    font-size: 14px;
                    font-weight: 600;
                    color: #0f172a;
                }
                
                .alert-content p {
                    margin: 0 0 4px 0;
                    font-size: 13px;
                    color: #475569;
                }
                
                .alert-date {
                    font-size: 12px;
                    color: #64748b;
                    font-weight: 500;
                }
                
                .metrics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 20px;
                }
                
                .metric-card {
                    padding: 24px;
                    border-radius: 12px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                
                .metric-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                
                .metric-card.blue { border-left: 4px solid #3b82f6; }
                .metric-card.green { border-left: 4px solid #10b981; }
                .metric-card.yellow { border-left: 4px solid #f59e0b; }
                .metric-card.red { border-left: 4px solid #ef4444; }
                
                .metric-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                
                .metric-header h3 {
                    font-size: 14px;
                    font-weight: 600;
                    color: #64748b;
                    margin: 0;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                .trend {
                    font-size: 16px;
                }
                
                .metric-value {
                    font-size: 36px;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1;
                    margin-bottom: 4px;
                }
                
                .metric-subtitle {
                    font-size: 13px;
                    color: #64748b;
                }
                
                .compliance-overview {
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 24px;
                }
                
                .compliance-scores {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    border: 1px solid #e2e8f0;
                }
                
                .score-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                
                .score-item:last-child {
                    border-bottom: none;
                }
                
                .score-label {
                    font-weight: 500;
                    color: #374151;
                }
                
                .score-value {
                    font-weight: 600;
                    font-size: 18px;
                }
                
                .score-value.excellent { color: #10b981; }
                .score-value.good { color: #3b82f6; }
                .score-value.warning { color: #f59e0b; }
                .score-value.poor { color: #ef4444; }
                
                .actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                }
                
                .action-list {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                }
                
                .action-list-header {
                    padding: 16px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    font-weight: 600;
                    color: #374151;
                    font-size: 14px;
                }
                
                .action-items {
                    max-height: 300px;
                    overflow-y: auto;
                }
                
                .action-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    border-bottom: 1px solid #f1f5f9;
                    transition: background-color 0.2s ease;
                }
                
                .action-item:hover {
                    background: #f8fafc;
                }
                
                .action-item:last-child {
                    border-bottom: none;
                }
                
                .action-icon {
                    font-size: 18px;
                    width: 24px;
                    text-align: center;
                }
                
                .action-content {
                    flex: 1;
                }
                
                .action-title {
                    display: block;
                    font-weight: 500;
                    color: #374151;
                    font-size: 14px;
                    margin-bottom: 2px;
                }
                
                .action-subtitle {
                    display: block;
                    font-size: 12px;
                    color: #64748b;
                }
                
                .recent-activity {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    padding: 24px;
                }
                
                .activity-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                
                .activity-item:last-child {
                    border-bottom: none;
                }
                
                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #64748b;
                }
                
                .spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid #f3f4f6;
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .empty-state {
                    text-align: center;
                    color: #64748b;
                    font-size: 14px;
                    padding: 32px;
                }
                
                @media (max-width: 768px) {
                    .dashboard-container {
                        padding: 16px;
                    }
                    
                    .compliance-overview {
                        grid-template-columns: 1fr;
                    }
                    
                    .metrics-grid {
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    }
                }
            `}</style>

            <div className="dashboard-header">
                <h1 className="dashboard-title">Fleet Dashboard</h1>
                <p className="dashboard-subtitle">Comprehensive overview of your fleet compliance and operations</p>
            </div>

            {dashboardData.error && (
                <div className="section">
                    <div className="alert-card error">
                        <div className="alert-icon">⚠️</div>
                        <div className="alert-content">
                            <h4>Error</h4>
                            <p>{dashboardData.error}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Critical Alerts Section */}
            <div className="section">
                <h2 className="section-title">🚨 Critical Alerts</h2>
                {dashboardData.criticalAlerts.length > 0 ? (
                    <div className="alerts-grid">
                        {dashboardData.criticalAlerts.map(alert => (
                            <AlertCard key={alert.id} alert={alert} />
                        ))}
                    </div>
                ) : (
                    <div className="alert-card info">
                        <div className="alert-icon">✅</div>
                        <div className="alert-content">
                            <h4>All Clear</h4>
                            <p>No critical alerts at this time</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Key Metrics Section */}
            <div className="section">
                <h2 className="section-title">📊 Key Metrics</h2>
                <div className="metrics-grid">
                    <MetricCard
                        title="Active Drivers"
                        value={dashboardData.keyMetrics.activeDrivers}
                        subtitle={`of ${dashboardData.keyMetrics.totalDrivers} total`}
                        color="blue"
                        trend="up"
                    />
                    <MetricCard
                        title="Fleet Status"
                        value={dashboardData.keyMetrics.activeVehicles}
                        subtitle={`of ${dashboardData.keyMetrics.totalVehicles} vehicles`}
                        color="green"
                    />
                    <MetricCard
                        title="Active Trips"
                        value={dashboardData.keyMetrics.activeTrips}
                        subtitle="Currently in progress"
                        color="yellow"
                    />
                    <MetricCard
                        title="Completed Today"
                        value={dashboardData.keyMetrics.completedToday}
                        subtitle="Trips finished"
                        color="green"
                    />
                    <MetricCard
                        title="Inspection Pass Rate"
                        value={`${dashboardData.keyMetrics.inspectionPassRate}%`}
                        subtitle="Last 30 days"
                        color="blue"
                    />
                    <MetricCard
                        title="Compliance Score"
                        value={`${dashboardData.keyMetrics.complianceScore}%`}
                        subtitle="Overall fleet rating"
                        color="green"
                        trend="up"
                    />
                </div>
            </div>

            {/* Compliance Scores Section */}
            <div className="section">
                <h2 className="section-title">🎯 Compliance Scores</h2>
                <div className="compliance-overview">
                    <div className="compliance-scores">
                        <div className="score-item">
                            <span className="score-label">Overall Compliance</span>
                            <span className={`score-value ${dashboardData.complianceScores.overall >= 90 ? 'excellent' : 
                                                          dashboardData.complianceScores.overall >= 80 ? 'good' : 
                                                          dashboardData.complianceScores.overall >= 70 ? 'warning' : 'poor'}`}>
                                {dashboardData.complianceScores.overall}%
                            </span>
                        </div>
                        <div className="score-item">
                            <span className="score-label">Driver Compliance</span>
                            <span className={`score-value ${dashboardData.complianceScores.drivers >= 90 ? 'excellent' : 
                                                          dashboardData.complianceScores.drivers >= 80 ? 'good' : 
                                                          dashboardData.complianceScores.drivers >= 70 ? 'warning' : 'poor'}`}>
                                {dashboardData.complianceScores.drivers}%
                            </span>
                        </div>
                        <div className="score-item">
                            <span className="score-label">Vehicle Compliance</span>
                            <span className={`score-value ${dashboardData.complianceScores.vehicles >= 90 ? 'excellent' : 
                                                          dashboardData.complianceScores.vehicles >= 80 ? 'good' : 
                                                          dashboardData.complianceScores.vehicles >= 70 ? 'warning' : 'poor'}`}>
                                {dashboardData.complianceScores.vehicles}%
                            </span>
                        </div>
                        <div className="score-item">
                            <span className="score-label">Operations Compliance</span>
                            <span className={`score-value ${dashboardData.complianceScores.operations >= 90 ? 'excellent' : 
                                                          dashboardData.complianceScores.operations >= 80 ? 'good' : 
                                                          dashboardData.complianceScores.operations >= 70 ? 'warning' : 'poor'}`}>
                                {dashboardData.complianceScores.operations}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Items Section */}
            <div className="section">
                <h2 className="section-title">📋 Action Items</h2>
                <div className="actions-grid">
                    <div className="action-list">
                        <div className="action-list-header">👤 Driver Actions Required</div>
                        <div className="action-items">
                            {dashboardData.actionItems.drivers.length > 0 ? 
                                dashboardData.actionItems.drivers.map(driver => (
                                    <ActionItem key={driver.id} item={driver} type="drivers" />
                                )) : 
                                <div className="empty-state">No driver actions required</div>
                            }
                        </div>
                    </div>

                    <div className="action-list">
                        <div className="action-list-header">🚛 Vehicle Issues</div>
                        <div className="action-items">
                            {dashboardData.actionItems.vehicles.length > 0 ? 
                                dashboardData.actionItems.vehicles.map(vehicle => (
                                    <ActionItem key={vehicle.id} item={vehicle} type="vehicles" />
                                )) : 
                                <div className="empty-state">No vehicle issues</div>
                            }
                        </div>
                    </div>

                    <div className="action-list">
                        <div className="action-list-header">🔍 Inspection Alerts</div>
                        <div className="action-items">
                            {dashboardData.actionItems.inspections.length > 0 ? 
                                dashboardData.actionItems.inspections.map((inspection, idx) => (
                                    <ActionItem key={idx} item={inspection} type="inspections" />
                                )) : 
                                <div className="empty-state">No inspection alerts</div>
                            }
                        </div>
                    </div>

                    <div className="action-list">
                        <div className="action-list-header">🔧 Maintenance Due</div>
                        <div className="action-items">
                            {dashboardData.actionItems.maintenance.length > 0 ? 
                                dashboardData.actionItems.maintenance.map((maintenance, idx) => (
                                    <ActionItem key={idx} item={maintenance} type="maintenance" />
                                )) : 
                                <div className="empty-state">No maintenance due</div>
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="section">
                <h2 className="section-title">🔄 Recent Activity</h2>
                <div className="recent-activity">
                    {dashboardData.recentActivity.length > 0 ? 
                        dashboardData.recentActivity.map(activity => (
                            <div key={activity.id} className="activity-item">
                                <div className="action-icon">
                                    {activity.icon || (activity.type === 'trip' ? '🚛' : activity.type === 'inspection' ? '🔍' : activity.type === 'maintenance' ? '🔧' : '📝')}
                                </div>
                                <div className="action-content">
                                    <span className="action-title">{activity.message}</span>
                                    <span className="action-subtitle">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        )) : 
                        <div className="empty-state">No recent activity</div>
                    }
                </div>
            </div>
        </div>
    );
};

export default Dashboard;