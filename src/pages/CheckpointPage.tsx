import React, { useState } from 'react';
import { Camera, X, CheckCircle } from 'lucide-react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

export default function CheckpointPage({ officerName, checkpointLoc }: { officerName?: string; checkpointLoc?: string } = {}) {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [autoOpenUrl, setAutoOpenUrl] = useState(false);
  const [lastScanDebug, setLastScanDebug] = useState<string | null>(null);

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
    transition: 'all 0.3s ease',
  };

  function isProbablyUrlOrDomain(code: string) {
    const urlPattern = /^(https?:\/\/)[^\s"']+$/i;
    const domainPattern = /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i;
    if (urlPattern.test(code)) return code;
    if (domainPattern.test(code)) return 'https://' + code.replace(/^https?:\/\//, '');
    return null;
  }

  const handleNewScan = () => {
    setScannedData(null);
    setError(null);
    setScanning(true);
  };

  const handleLogout = () => {
    setScanning(false);
    window.location.href = '/';
  };

  const handleVerify = () => {
    (async () => {
      if (!scannedData) {
        alert('No scanned data to verify')
        return
      }

      // try parse id from scanned data
      let parsed: any = null
      try { parsed = JSON.parse(scannedData) } catch (e) { parsed = null }

      const shipmentId = parsed && parsed.id ? parsed.id : null
      if (!shipmentId) {
        alert('Cannot verify: scanned payload does not contain shipment id')
        return
      }

      const API_URL = 'http://localhost:5000/api'
      const timestamp = new Date().toISOString()

      try {
        const currentLocation = checkpointLoc || sessionStorage.getItem('checkpoint-location') || 'Unknown Location'
        const currentOfficer = officerName || sessionStorage.getItem('checkpoint-user') || 'Unknown'
        
        // First update location
        try {
          await fetch(`${API_URL}/shipments/${shipmentId}/location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              location: currentLocation,
              officer: currentOfficer,
              action: 'verified'
            })
          })
        } catch (locErr) {
          console.warn('Failed to update location, continuing:', locErr)
        }

        // Send PUT to backend to update status and receivedAt
        const resp = await fetch(`${API_URL}/shipments/${shipmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'received', 
            receivedAt: timestamp,
            location: currentLocation,
            officer: currentOfficer,
            action: 'verified'
          })
        })

        if (!resp.ok) {
          const text = await resp.text()
          console.error('Failed to update shipment:', text)
          alert('Failed to update shipment on server')
          return
        }

        const updated = await resp.json()

        // persist checkpoint scan locally so Admin page can read it
        const scansRaw = localStorage.getItem('checkpoint-scans')
        const scans = scansRaw ? JSON.parse(scansRaw) : []
        scans.unshift({ officer: currentOfficer, shipmentId, location: currentLocation, action: 'verified', timestamp })
        localStorage.setItem('checkpoint-scans', JSON.stringify(scans))

        alert('Shipment verified and location updated')
        console.log('Verified shipment:', updated)
      } catch (err) {
        console.error('Error verifying shipment:', err)
        alert('Error verifying shipment')
      }
    })()
  }

  const handleTamper = () => {
    (async () => {
      if (!scannedData) {
        alert('No scanned data to mark tampering')
        return
      }

      let parsed: any = null
      try { parsed = JSON.parse(scannedData) } catch (e) { parsed = null }
      const shipmentId = parsed && parsed.id ? parsed.id : null
      const API_URL = 'http://localhost:5000/api'
      const timestamp = new Date().toISOString()

      try {
        if (shipmentId) {
          const resp = await fetch(`${API_URL}/shipments/${shipmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'tampered', tamperedAt: timestamp })
          })

          if (!resp.ok) {
            const text = await resp.text()
            console.error('Failed to update shipment tamper status:', text)
          }
        }

        const scansRaw = localStorage.getItem('checkpoint-scans')
        const scans = scansRaw ? JSON.parse(scansRaw) : []
        scans.unshift({ officer: officerName || sessionStorage.getItem('checkpoint-user') || 'Unknown', shipmentId: shipmentId || 'unknown', location: checkpointLoc || '', action: 'tampered', timestamp })
        localStorage.setItem('checkpoint-scans', JSON.stringify(scans))

        alert('Tampering alert recorded')
        console.warn('Tampering alert for scanned data:', scannedData)
      } catch (err) {
        console.error('Error recording tampering alert:', err)
        alert('Error recording tampering alert')
      }
    })()
  }

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white">
      <div className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #262626 1px, transparent 1px),linear-gradient(to bottom, #262626 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      <section className="flex items-center justify-center px-4 relative z-10" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
        <div className="max-w-[900px] w-full">
          {/* Optional officer header: name on left, location on right */}
          {(officerName || checkpointLoc) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', padding: '0 6px' }}>
              <div style={{ fontFamily: 'Source Code Pro, monospace', color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>{officerName ? `Officer: ${officerName}` : ''}</div>
              <div style={{ fontFamily: 'Source Code Pro, monospace', color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{checkpointLoc ? `${checkpointLoc}` : ''}</div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', color: 'rgb(242,242,242)', fontWeight: 700 }}>Checkpoint Scanner</h1>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleLogout} style={buttonStyle}>Logout</button>
            </div>
          </div>
          <div style={{ border: '2.5px solid rgba(255, 255, 255, 0.2)', borderRadius: '20px', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: 'clamp(24px, 4vw, 40px)', textAlign: 'center', minHeight: '420px' }}>
            {!scanning && !scannedData && (
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(255, 255, 255, 0.1)', marginBottom: '24px' }}>
                  <Camera size={40} color="rgba(255, 255, 255, 0.7)" />
                </div>
                <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)', color: '#fff', fontWeight: 700, marginBottom: '12px' }}>Scan QR Code</h2>
                <p style={{ fontFamily: 'Source Code Pro, monospace', fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '32px' }}>Click below to start live QR scanner</p>
                {error && (<div style={{ backgroundColor: 'rgba(255, 0, 0, 0.2)', border: '1px solid rgba(255, 0, 0, 0.4)', borderRadius: '12px', padding: '12px', marginBottom: '24px', fontFamily: 'Source Code Pro, monospace', fontSize: '13px', color: 'rgba(255, 100, 100, 1)' }}>{error}</div>)}
                <button onClick={()=>setScanning(true)} style={{ ...buttonStyle, padding: '14px 32px', fontSize: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={20}/> Start Scanning
                </button>
              </div>
            )}
            {scanning && (
              <div>
                <div style={{ position: 'relative', maxWidth: '720px', width: '100%', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#000' }}>
                  {/* Larger/responsive scanner and safer handling of detected URLs (don't auto-redirect by default) */}
                  <BarcodeScannerComponent
                    width={640}
                    height={480}
                    onUpdate={(err, result) => {
                      let qrText: string | null = null;
                      if (result && typeof result === 'object' && 'getText' in result && typeof result.getText === 'function') {
                        try {
                          qrText = result.getText();
                        } catch (e) {
                          qrText = null;
                        }
                      }

                      // Save a small debug trace for laptop troubleshooting
                      if (qrText) setLastScanDebug(`Detected text: ${qrText}`);
                      else if (err && typeof err === 'object' && err !== null && 'message' in err) setLastScanDebug(`Error: ${(err as { message?: unknown }).message}`);

                      if (qrText) {
                        setScannedData(qrText);
                        setError(null);
                        const to = isProbablyUrlOrDomain(qrText);
                        if (to) {
                          setDetectedUrl(to);
                          if (autoOpenUrl) {
                            // Only auto-navigate when user enabled the option
                            window.location.href = to;
                          }
                        }
                      }

                      if (err) {
                        setError(typeof err === 'object' && err !== null && 'message' in err ? String((err as { message?: unknown }).message) : String(err));
                      }
                    }}
                  />

                  {/* Small debug / control area to help laptop users */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.5)' }}>
                    <label style={{ fontFamily: 'Source Code Pro, monospace', fontSize: 12, color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={autoOpenUrl} onChange={(e) => setAutoOpenUrl(e.target.checked)} />
                      Auto-open detected URL
                    </label>
                    <div style={{ fontFamily: 'Source Code Pro, monospace', fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{lastScanDebug || 'Waiting for scan...'}</div>
                  </div>
                </div>

                {/* If a URL was detected, show it and let user open it (helps debugging on laptop cameras) */}
                {detectedUrl && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    <a href={detectedUrl} target="_blank" rel="noreferrer" style={{ ...buttonStyle, textDecoration: 'none' }}>Open Detected URL</a>
                    <button onClick={() => { navigator.clipboard?.writeText(detectedUrl); alert('URL copied to clipboard'); }} style={{ ...buttonStyle, padding: '10px 14px' }}>Copy URL</button>
                  </div>
                )}
                <button onClick={()=>setScanning(false)} style={{ ...buttonStyle, margin:'18px auto 0', backgroundColor: 'rgba(255, 0, 0, 0.3)', border: '2px solid rgba(255, 0, 0, 0.5)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <X size={18} /> Cancel
                </button>
              </div>
            )}
            {scannedData && (() => {
              // Try to parse scannedData as JSON to render a structured view
              let parsed: any = null
              try {
                parsed = JSON.parse(scannedData)
              } catch (e) {
                parsed = null
              }

              return (
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(0, 255, 0, 0.2)', marginBottom: '24px' }}>
                    <CheckCircle size={40} color="rgba(0, 255, 0, 1)" />
                  </div>
                  <h2 style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)', color: '#fff', fontWeight: 700, marginBottom: '12px' }}>QR Code Scanned!</h2>

                  {/* Structured view when JSON */}
                  {parsed && typeof parsed === 'object' ? (
                    <div style={{ marginTop: '16px', marginBottom: '24px', overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                        <tbody>
                          {Object.keys(parsed).map((key) => (
                            <tr key={key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <td style={{ padding: '12px 16px', fontFamily: 'Source Code Pro, monospace', fontSize: '13px', color: 'rgba(255,255,255,0.7)', width: '35%', textTransform: 'capitalize' }}>{key}</td>
                              <td style={{ padding: '12px 16px', fontFamily: 'Source Code Pro, monospace', fontSize: '14px', color: '#fff', whiteSpace: 'pre-wrap' }}>
                                {typeof parsed[key] === 'object' ? JSON.stringify(parsed[key], null, 2) : String(parsed[key])}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '16px', marginTop: '24px', marginBottom: '24px', wordBreak: 'break-all' }}>
                      <p style={{ fontFamily: 'Source Code Pro, monospace', fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Scanned Data</p>
                      <pre style={{ fontFamily: 'Source Code Pro, monospace', fontSize: '13px', color: '#fff', margin: 0, whiteSpace: 'pre-wrap' }}>{scannedData}</pre>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button onClick={handleNewScan} style={{ ...buttonStyle, padding: '14px 24px', fontSize: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <Camera size={18}/> Scan Another
                    </button>

                    <button onClick={handleVerify} style={{ ...buttonStyle, padding: '12px 20px', fontSize: '14px', backgroundColor: 'rgba(0,128,0,0.18)', border: '2px solid rgba(0,128,0,0.35)' }}>
                      Verify
                    </button>

                    <button onClick={handleTamper} style={{ ...buttonStyle, padding: '12px 20px', fontSize: '14px', backgroundColor: 'rgba(255,0,0,0.18)', border: '2px solid rgba(255,0,0,0.35)' }}>
                      Tampering Alert
                    </button>
                  </div>
                </div>
              )
            })()}
          </div>
          <div style={{ marginTop: '24px', border: '2px dashed rgba(255, 255, 255, 0.15)', borderRadius: '16px', backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '20px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Source Code Pro, monospace', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)', lineHeight: '1.6' }}>
              Powered by <code style={{ color: '#69c' }}>react-qr-barcode-scanner</code> for bulletproof QR code detection and preview.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}