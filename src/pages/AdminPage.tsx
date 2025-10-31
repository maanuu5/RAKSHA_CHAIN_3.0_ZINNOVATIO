
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { isAdminAuthenticated, setAdminAuthenticated } from '../lib/adminAuth';

// Shipment type
type Shipment = {
  name: string;
  id: string;
  supply: string;
  initLoc: string;
  finalLoc: string;
  date: string;
  status?: string;
  receivedAt?: string;
  tamperedAt?: string;
};

type CheckpointScan = {
  officer: string;
  shipmentId: string;
  location: string;
  action: 'verified' | 'tampered' | string;
  timestamp: string;
};

const ADMIN_USERNAME = 'ADMIN';
const ADMIN_PASSWORD = 'ADMIN123';

const AdminPage: React.FC = () => {
  const [authed, setAuthed] = useState(isAdminAuthenticated());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loadingShipments, setLoadingShipments] = useState(true);
  const [checkpointScans, setCheckpointScans] = useState<CheckpointScan[]>([]);
  const [estimates, setEstimates] = useState<Record<string, { loading: boolean; error?: string; data?: { durationFormatted: string; distanceFormatted: string; profile: string } }>>({});

  const navigate = useNavigate();

  // Fetch shipments from backend
  useEffect(() => {
    if (!authed) return;
    const fetchShipments = async () => {
      setLoadingShipments(true);
      try {
        const res = await fetch('http://localhost:5000/api/shipments');
        if (!res.ok) throw new Error('Failed to fetch shipments');
        const data = await res.json();
        setShipments(data);
      } catch (e) {
        setShipments([]);
      } finally {
        setLoadingShipments(false);
      }
    };
    fetchShipments();
  }, [authed]);

  // Fetch estimated travel time for each shipment (initLoc -> finalLoc)
  useEffect(() => {
    if (!authed) return;
    if (!shipments.length) return;

    const fetchEstimate = async (shipmentId: string) => {
      setEstimates(prev => ({ ...prev, [shipmentId]: { loading: true } }));
      try {
        const res = await fetch(`http://localhost:5000/api/shipments/${encodeURIComponent(shipmentId)}/estimate?mode=driving-car`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const json = await res.json();
        setEstimates(prev => ({
          ...prev,
          [shipmentId]: {
            loading: false,
            data: {
              durationFormatted: json.durationFormatted,
              distanceFormatted: json.distanceFormatted,
              profile: json.profile || 'driving-car'
            }
          }
        }));
      } catch (e: any) {
        setEstimates(prev => ({ ...prev, [shipmentId]: { loading: false, error: e && e.message ? e.message : 'Failed to estimate' } }));
      }
    };

    shipments.forEach(s => {
      const entry = estimates[s.id];
      if (!entry || (!entry.loading && !entry.data && !entry.error)) {
        fetchEstimate(s.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, shipments]);

  // Load checkpoint scans from localStorage
  useEffect(() => {
    if (!authed) return;
    const scans = localStorage.getItem('checkpoint-scans');
    if (scans) {
      try {
        setCheckpointScans(JSON.parse(scans));
      } catch (e) {
        setCheckpointScans([]);
      }
    } else {
      setCheckpointScans([]);
    }
  }, [authed]);

  // Poll shipments periodically so admin sees updates made by checkpoint officers
  useEffect(() => {
    if (!authed) return;
    let cancelled = false
    const fetchShipments = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/shipments');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setShipments(data);
      } catch (e) {
        // ignore
      }
    }

    // initial fetch already handled elsewhere, but poll for changes
    const id = setInterval(fetchShipments, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [authed]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setAdminAuthenticated(true);
      setAuthed(true);
      setError('');
    } else {
      setError('Invalid admin credentials');
    }
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setAuthed(false);
    setUsername('');
    setPassword('');
    // Navigate back to landing page after logout
    navigate('/');
  };

  if (!authed) {
    return (
      <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white flex items-center justify-center">
        {/* Small Grid Pattern */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #262626 1px, transparent 1px),
              linear-gradient(to bottom, #262626 1px, transparent 1px)
            `,
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative z-10 w-full max-w-md mx-auto" style={{ padding: 'clamp(24px, 6vw, 48px)', borderRadius: 24, background: 'rgba(0,0,0,0.7)', boxShadow: '0 4px 32px 0 rgba(0,0,0,0.25)', border: '2.5px solid rgba(255,255,255,0.08)' }}>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', color: 'rgb(242,242,242)', textAlign: 'center', marginBottom: 24 }}>Admin Login</h1>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: 12,
                  borderRadius: 12,
                  border: '2px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontFamily: 'Source Code Pro, monospace',
                  fontSize: 'clamp(15px, 2vw, 18px)',
                  outline: 'none',
                  letterSpacing: '0.02em',
                }}
                autoFocus
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '2px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontFamily: 'Source Code Pro, monospace',
                  fontSize: 'clamp(15px, 2vw, 18px)',
                  outline: 'none',
                  letterSpacing: '0.02em',
                }}
              />
            </div>
            {error && <div style={{ color: '#ff4d4f', marginBottom: 12, textAlign: 'center', fontFamily: 'Source Code Pro, monospace' }}>{error}</div>}
            <button
              type="submit"
              style={{
                width: '100%',
                padding: 'clamp(12px, 2.5vh, 16px)',
                borderRadius: 16,
                border: '2.5px solid rgba(255,255,255,0.15)',
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                fontFamily: 'doto, sans-serif',
                fontWeight: 600,
                fontSize: 'clamp(15px, 2vw, 18px)',
                letterSpacing: '0.02em',
                cursor: 'pointer',
                textTransform: 'uppercase',
                transition: 'all 0.3s ease',
                marginTop: 8,
                boxShadow: '0 2px 12px 0 rgba(0,0,0,0.10)'
              }}
            >Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Small Grid Pattern */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #262626 1px, transparent 1px),
            linear-gradient(to bottom, #262626 1px, transparent 1px)
          `,
          backgroundSize: "20px 20px",
        }}
      />
      <div className="relative z-10 max-w-[1200px] px-4" style={{ 
          marginLeft: 'auto', 
          marginRight: 'auto', 
          width: '85%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 'clamp(80px, 10vh, 120px)',
          paddingBottom: '40px'
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', padding: '0 20px' }}>
          <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontWeight: 700, fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', color: 'rgb(242,242,242)' }}>Admin Page</h1>
          <button
            onClick={handleLogout}
            style={{
              fontFamily: 'doto, sans-serif',
              fontSize: 'clamp(12px, 1.5vw, 14px)',
              fontWeight: 600,
              padding: '8px 18px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >Logout</button>
        </div>

        {/* Shipments Section */}
        <section style={{ 
          marginTop: 40, 
          marginBottom: 40,
          padding: '24px',
          background: 'rgba(0,0,0,0.4)',
          border: '2.5px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ 
            fontSize: 22, 
            marginBottom: 20, 
            fontFamily: 'Orbitron, sans-serif', 
            color: '#fff',
            paddingBottom: '12px',
            borderBottom: '2px solid rgba(255,255,255,0.1)'
          }}>Shipments</h2>
          {loadingShipments ? (
            <div style={{ fontFamily: 'Source Code Pro, monospace', color: 'rgba(255,255,255,0.7)' }}>Loading shipments...</div>
          ) : shipments.length === 0 ? (
            <div style={{ fontFamily: 'Source Code Pro, monospace', color: 'rgba(255,255,255,0.7)' }}>No shipments found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(0,0,0,0.3)', borderRadius: 16, textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>Name</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>ID</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>Supply</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>Initial Location</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>Final Location</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>Date</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center' }}>Est Time/Travel</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 15, color: '#fff', textAlign: 'center' }}>{s.name}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 15, color: '#fff', textAlign: 'center' }}>{s.id}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 15, color: '#fff', textAlign: 'center' }}>{s.supply}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 15, color: '#fff', textAlign: 'center' }}>{s.initLoc}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 15, color: '#fff', textAlign: 'center' }}>{s.finalLoc}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 15, color: '#fff', textAlign: 'center' }}>{s.date}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 15, textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: s.status === 'received' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 0, 0.2)',
                          color: s.status === 'received' ? '#00ff00' : '#ffff00'
                        }}>
                          {s.status === 'received' ? 'Received' : 'Not Received'}
                        </span>
                      </td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', fontSize: 14, color: '#fff', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const e = estimates[s.id];
                          if (!e || e.loading) return 'Estimating...';
                          if (e.error) return '—';
                          if (e.data) return `${e.data.durationFormatted} • ${e.data.distanceFormatted}`;
                          return '—';
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Checkpoint Scans Section */}
        <section style={{ 
          marginTop: 40, 
          marginBottom: 40,
          padding: '24px',
          background: 'rgba(0,0,0,0.4)',
          border: '2.5px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ 
            fontSize: 22, 
            marginBottom: 20, 
            fontFamily: 'Orbitron, sans-serif', 
            color: '#fff',
            paddingBottom: '12px',
            borderBottom: '2px solid rgba(255,255,255,0.1)'
          }}>Checkpoint Scans</h2>
          {checkpointScans.length === 0 ? (
            <div style={{ fontFamily: 'Source Code Pro, monospace', color: 'rgba(255,255,255,0.7)' }}>No checkpoint scans found.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>Officer</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>Shipment ID</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>Location</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>Action</th>
                    <th style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {checkpointScans.map((scan, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>{scan.officer}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>{scan.shipmentId}</td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>{scan.location}</td>
                      <td style={{ padding: 12 }}>
                        {scan.action === 'verified' ? (
                          <span style={{ padding: '6px 12px', borderRadius: 12, backgroundColor: 'rgba(0,255,0,0.12)', color: '#8fff8f', fontFamily: 'Source Code Pro, monospace' }}>Verified</span>
                        ) : scan.action === 'tampered' ? (
                          <span style={{ padding: '6px 12px', borderRadius: 12, backgroundColor: 'rgba(255,0,0,0.12)', color: '#ff8f8f', fontFamily: 'Source Code Pro, monospace' }}>Tampered</span>
                        ) : (
                          <span style={{ padding: '6px 12px', borderRadius: 12, backgroundColor: 'rgba(255,255,0,0.08)', color: '#fff', fontFamily: 'Source Code Pro, monospace' }}>{scan.action}</span>
                        )}
                      </td>
                      <td style={{ padding: 12, fontFamily: 'Source Code Pro, monospace', color: '#fff' }}>{new Date(scan.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Receiving Officer section placeholder */}
        <section style={{ 
          marginTop: 40, 
          marginBottom: 40,
          padding: '24px',
          background: 'rgba(0,0,0,0.4)',
          border: '2.5px solid rgba(255,255,255,0.1)',
          borderRadius: '24px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
        }}>
          <h2 style={{ 
            fontSize: 22, 
            marginBottom: 20, 
            fontFamily: 'Orbitron, sans-serif', 
            color: '#fff',
            paddingBottom: '12px',
            borderBottom: '2px solid rgba(255,255,255,0.1)'
          }}>Receiving Officer</h2>
          <div style={{ fontFamily: 'Source Code Pro, monospace', color: 'rgba(255,255,255,0.7)' }}>Info will be added here later.</div>
        </section>
      </div>
    </div>
  );
};

export default AdminPage;
