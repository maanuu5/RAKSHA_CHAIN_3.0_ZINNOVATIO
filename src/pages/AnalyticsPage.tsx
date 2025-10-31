import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { TrendingUp, Package, MapPin, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

const API_URL = 'http://localhost:5000/api'

interface OverviewData {
  total: number
  statusBreakdown: {
    pending: number
    inTransit: number
    received: number
    tampered: number
  }
  locationStats: Record<string, number>
  supplyStats: Record<string, number>
  recentShipmentsCount: number
  avgDeliveryHours: number
  deliveredCount: number
}

interface RouteData {
  route: string
  initLoc: string
  finalLoc: string
  total: number
  completed: number
  inProgress: number
  avgDeliveryHours: number
}

interface CheckpointData {
  location: string
  totalScans: number
  uniqueShipments: number
  officersCount: number
}

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [routes, setRoutes] = useState<RouteData[]>([])
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>([])
  const [timeline, setTimeline] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'checkpoints' | 'timeline'>('overview')

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [overviewRes, routesRes, checkpointsRes, timelineRes] = await Promise.all([
        fetch(`${API_URL}/analytics/overview`),
        fetch(`${API_URL}/analytics/routes`),
        fetch(`${API_URL}/analytics/checkpoints`),
        fetch(`${API_URL}/analytics/timeline`)
      ])

      if (!overviewRes.ok) {
        let errorText = ''
        try {
          errorText = await overviewRes.text()
        } catch (e) {
          errorText = `HTTP ${overviewRes.status}: ${overviewRes.statusText}`
        }
        
        if (overviewRes.status === 0 || overviewRes.status === 404) {
          throw new Error('Backend server is not running. Please start the backend server on port 5000.')
        }
        
        throw new Error(`Failed to fetch overview: ${overviewRes.status} - ${errorText}`)
      }

      const overviewData = await overviewRes.json()
      setOverview(overviewData)
      console.log('Overview data:', overviewData)

      if (routesRes.ok) {
        const routesData = await routesRes.json()
        setRoutes(routesData.routes || [])
        console.log('Routes data:', routesData.routes)
      } else {
        console.warn('Failed to fetch routes:', routesRes.status)
      }

      if (checkpointsRes.ok) {
        const checkpointsData = await checkpointsRes.json()
        setCheckpoints(checkpointsData.checkpoints || [])
        console.log('Checkpoints data:', checkpointsData.checkpoints)
      } else {
        console.warn('Failed to fetch checkpoints:', checkpointsRes.status)
      }

      if (timelineRes.ok) {
        const timelineData = await timelineRes.json()
        setTimeline(timelineData.timeline || [])
        console.log('Timeline data:', timelineData.timeline)
      } else {
        console.warn('Failed to fetch timeline:', timelineRes.status)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      let errorMessage = 'Failed to load analytics data.'
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Cannot connect to backend server. Please make sure the backend is running on http://localhost:5000'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    // Refresh every 10 seconds
    const interval = setInterval(fetchAnalytics, 10000)
    return () => clearInterval(interval)
  }, [])

  const buttonStyle: React.CSSProperties = {
    fontFamily: 'doto, sans-serif',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    fontWeight: '600',
    padding: '8px 18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '20px',
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: '#fff',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  }

  const COLORS = ['#0099ff', '#00ff00', '#ffff00', '#ff6b6b', '#9b59b6', '#ff9800']

  // Prepare data for charts
  const statusChartData = overview ? [
    { name: 'Pending', value: overview.statusBreakdown.pending, color: '#ffff00' },
    { name: 'In Transit', value: overview.statusBreakdown.inTransit, color: '#0099ff' },
    { name: 'Received', value: overview.statusBreakdown.received, color: '#00ff00' },
    { name: 'Tampered', value: overview.statusBreakdown.tampered, color: '#ff6b6b' }
  ] : []

  const locationChartData = overview ? Object.entries(overview.locationStats)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) : []

  const supplyChartData = overview ? Object.entries(overview.supplyStats)
    .map(([supply, count]) => ({ supply, count }))
    .sort((a, b) => b.count - a.count) : []

  const routeChartData = routes.slice(0, 10).map(route => ({
    route: route.route.length > 20 ? route.route.substring(0, 20) + '...' : route.route,
    completed: route.completed,
    inProgress: route.inProgress,
    avgHours: route.avgDeliveryHours
  }))

  if (loading && !overview && !error) {
    return (
      <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white flex items-center justify-center">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(to right, #262626 1px, transparent 1px),linear-gradient(to bottom, #262626 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)' }}>
          Loading analytics...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(to right, #262626 1px, transparent 1px),linear-gradient(to bottom, #262626 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <section className="flex flex-col px-4 relative z-10" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
          <div className="max-w-[1400px] w-full mx-auto">
            <div style={{
              border: '2.5px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              padding: '40px',
              textAlign: 'center'
            }}>
              <AlertCircle size={48} color="#ff6b6b" style={{ marginBottom: '20px' }} />
              <h2 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '20px', color: '#ff6b6b', marginBottom: '12px' }}>
                Error Loading Analytics
              </h2>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px' }}>
                {error}
              </p>
              <button onClick={fetchAnalytics} style={buttonStyle}>
                Retry
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #262626 1px, transparent 1px),linear-gradient(to bottom, #262626 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />

      <section className="flex flex-col px-4 relative z-10" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
        <div className="max-w-[1400px] w-full mx-auto">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', color: 'rgb(242,242,242)', fontWeight: 700, marginBottom: '8px' }}>
                Analytics Dashboard
              </h1>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                Real-time insights and statistics
              </p>
            </div>
            <button onClick={() => navigate('/dispatch')} style={buttonStyle}>
              Back to Dispatch
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div style={{
              border: '2.5px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              padding: '20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertCircle size={24} color="#ff6b6b" />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: '#ff6b6b', margin: 0 }}>
                  {error}
                </p>
              </div>
              <button onClick={fetchAnalytics} style={{ ...buttonStyle, padding: '6px 12px', fontSize: '12px' }}>
                Retry
              </button>
            </div>
          )}

          {/* Key Metrics Cards */}
          {overview && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
              <div style={{
                border: '2.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Package size={24} color="#0099ff" />
                  <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>TOTAL SHIPMENTS</p>
                </div>
                <p style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '32px', color: '#fff', fontWeight: 700, margin: 0 }}>
                  {overview.total}
                </p>
              </div>

              <div style={{
                border: '2.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <Clock size={24} color="#00ff00" />
                  <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>AVG DELIVERY TIME</p>
                </div>
                <p style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '32px', color: '#fff', fontWeight: 700, margin: 0 }}>
                  {overview.avgDeliveryHours > 0 && overview.deliveredCount > 0 
                    ? `${overview.avgDeliveryHours}h` 
                    : 'N/A'}
                </p>
                {overview.deliveredCount === 0 && overview.statusBreakdown.received > 0 && (
                  <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', margin: 0 }}>
                    Insufficient timing data
                  </p>
                )}
                {overview.deliveredCount === 0 && overview.statusBreakdown.received === 0 && (
                  <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px', margin: 0 }}>
                    No completed deliveries yet
                  </p>
                )}
              </div>

              <div style={{
                border: '2.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <TrendingUp size={24} color="#ffff00" />
                  <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>RECENT (30 DAYS)</p>
                </div>
                <p style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '32px', color: '#fff', fontWeight: 700, margin: 0 }}>
                  {overview.recentShipmentsCount}
                </p>
              </div>

              <div style={{
                border: '2.5px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <CheckCircle2 size={24} color="#00ff00" />
                  <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>DELIVERED</p>
                </div>
                <p style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '32px', color: '#fff', fontWeight: 700, margin: 0 }}>
                  {overview.deliveredCount}
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
            {(['overview', 'routes', 'checkpoints', 'timeline'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...buttonStyle,
                  padding: '10px 20px',
                  backgroundColor: activeTab === tab ? 'rgba(0, 153, 255, 0.3)' : 'rgba(0,0,0,0.8)',
                  border: `2px solid ${activeTab === tab ? 'rgba(0, 153, 255, 0.5)' : 'rgba(255,255,255,0.3)'}`
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && overview && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
              {/* Status Breakdown Pie Chart */}
              {statusChartData.length > 0 && statusChartData.some(d => d.value > 0) ? (
                <div style={{
                  border: '2.5px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  padding: '24px'
                }}>
                  <h3 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
                    Status Breakdown
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{
                  border: '2.5px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  padding: '40px',
                  textAlign: 'center'
                }}>
                  <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    No status data available
                  </p>
                </div>
              )}

              {/* Supply Type Chart */}
              {supplyChartData.length > 0 && (
                <div style={{
                  border: '2.5px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  padding: '24px'
                }}>
                  <h3 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
                    Supply Type Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={supplyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="supply" stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                      <YAxis stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#0099ff" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Location Statistics */}
              {locationChartData.length > 0 && (
                <div style={{
                  border: '2.5px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  padding: '24px',
                  gridColumn: locationChartData.length > 5 ? '1 / -1' : 'auto'
                }}>
                  <h3 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
                    Top Locations
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={locationChartData.map((item, index) => ({ ...item, color: COLORS[index % COLORS.length] }))} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis type="number" stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                      <YAxis dataKey="location" type="category" stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} width={100} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count">
                        {locationChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Routes Tab */}
          {activeTab === 'routes' && routes.length > 0 && (
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '24px'
            }}>
              <h3 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
                Route Performance
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ textAlign: 'left', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', color: '#fff' }}>Route</th>
                      <th style={{ textAlign: 'center', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', color: '#fff' }}>Total</th>
                      <th style={{ textAlign: 'center', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', color: '#fff' }}>Completed</th>
                      <th style={{ textAlign: 'center', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', color: '#fff' }}>In Progress</th>
                      <th style={{ textAlign: 'center', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', color: '#fff' }}>Avg Time (hours)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: '#fff' }}>{route.route}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: '#fff' }}>{route.total}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: '#00ff00' }}>{route.completed}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: '#0099ff' }}>{route.inProgress}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: '#fff' }}>
                          {route.avgDeliveryHours > 0 ? route.avgDeliveryHours : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Checkpoints Tab */}
          {activeTab === 'checkpoints' && checkpoints.length > 0 && (
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '24px'
            }}>
              <h3 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
                Checkpoint Activity
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={checkpoints.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="location" stroke="#fff" tick={{ fill: '#fff', fontSize: 11 }} angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="totalScans" fill="#0099ff" name="Total Scans" />
                  <Bar dataKey="uniqueShipments" fill="#00ff00" name="Unique Shipments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && timeline.length > 0 && (
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '24px'
            }}>
              <h3 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: '18px', color: '#fff', marginBottom: '20px' }}>
                Shipment Timeline
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={timeline.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#fff" tick={{ fill: '#fff', fontSize: 11 }} />
                  <YAxis stroke="#fff" tick={{ fill: '#fff', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f0f0f', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#0099ff" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="received" stroke="#00ff00" strokeWidth={2} name="Received" />
                  <Line type="monotone" dataKey="inTransit" stroke="#ffff00" strokeWidth={2} name="In Transit" />
                  <Line type="monotone" dataKey="pending" stroke="#ff9800" strokeWidth={2} name="Pending" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab !== 'overview' && (
            (activeTab === 'routes' && routes.length === 0) ||
            (activeTab === 'checkpoints' && checkpoints.length === 0) ||
            (activeTab === 'timeline' && timeline.length === 0)
          ) && (
            <div style={{
              border: '2.5px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)' }}>
                No data available for this section yet.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}


