
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Shipment {
  name: string
  id: string
  supply: string
  initLoc: string
  finalLoc: string
  date: string
  status?: string
}

export default function ReceivingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  // IMPORTANT: Change this to your backend URL
  const API_URL = 'http://localhost:5000/api'

  // Fetch shipments when component loads
  useEffect(() => {
    fetchShipments()
  }, [])

  const fetchShipments = async () => {
    try {
      const response = await fetch(`${API_URL}/shipments`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setShipments(data)
    } catch (error) {
      console.error('Error fetching shipments:', error)
      alert('Failed to fetch shipments. Make sure backend is running on port 5000')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('isReceivingLoggedIn')
    navigate('/')
  }

  const handleReceived = async (shipmentId: string) => {
    try {
      // First find the current shipment
      const currentShipment = shipments.find(s => s.id === shipmentId)
      if (!currentShipment) {
        throw new Error('Shipment not found')
      }

      console.log('Updating shipment status:', shipmentId)
      console.log('Current shipment:', currentShipment)

      const response = await fetch(`${API_URL}/shipments/${shipmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...currentShipment,
          status: 'received'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server response:', errorText)
        throw new Error('Failed to update shipment status')
      }

      const updatedShipment = await response.json()
      console.log('Updated shipment from server:', updatedShipment)

      // Update local state with the response from server
      setShipments(prevShipments => {
        const newShipments = prevShipments.map(s =>
          s.id === shipmentId ? { ...s, status: 'received' } : s
        )
        console.log('Updated shipments state:', newShipments)
        return newShipments
      })

      // Fetch fresh data from server
      await fetchShipments()

      alert('Shipment marked as received successfully!')
    } catch (error) {
      console.error('Error updating shipment:', error)
      alert('Failed to update shipment status')
    }
  }

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

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white">
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
      
      {/* Content */}
      <section className="flex items-center justify-center px-4 relative z-10" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
        <div className="max-w-[1200px] w-full">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', color: 'rgb(242,242,242)', fontWeight: 700 }}>Incoming Shipments</h1>
            <button onClick={handleLogout} style={buttonStyle}>Logout</button>
          </div>

          {/* Shipments Table */}
          {loading ? (
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)' }}>
                Loading shipments...
              </p>
            </div>
          ) : shipments.length > 0 ? (
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '12px',
              overflow: 'auto'
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    <th style={{ textAlign: 'left', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>Name</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>ID</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>Supply</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>Ini. Loc.</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>Final Loc.</th>
                    <th style={{ textAlign: 'left', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>Date</th>
                    <th style={{ textAlign: 'center', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>Status</th>
                    <th style={{ textAlign: 'center', padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '13px', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: i < shipments.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                      <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px' }}>{s.name}</td>
                      <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px' }}>{s.id}</td>
                      <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px' }}>{s.supply}</td>
                      <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px' }}>{s.initLoc}</td>
                      <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px' }}>{s.finalLoc}</td>
                      <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px' }}>{s.date}</td>
                      <td style={{ padding: '12px', fontFamily: '"Source Code Pro", monospace', fontSize: '14px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: s.status === 'received' ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 0, 0.2)',
                          color: s.status === 'received' ? '#00ff00' : '#ffff00',
                          fontSize: '12px'
                        }}>
                          {s.status === 'received' ? 'Received' : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleReceived(s.id)}
                          disabled={s.status === 'received'}
                          style={{
                            ...buttonStyle,
                            padding: '6px 12px',
                            fontSize: '12px',
                            backgroundColor: s.status === 'received' ? 'rgba(0, 255, 0, 0.3)' : 'rgba(0, 0, 0, 0.8)',
                            opacity: s.status === 'received' ? 0.5 : 1,
                            cursor: s.status === 'received' ? 'default' : 'pointer'
                          }}
                        >
                          {s.status === 'received' ? 'Received' : 'Mark as Received'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              border: '2.5px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)' }}>
                No shipments found.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}