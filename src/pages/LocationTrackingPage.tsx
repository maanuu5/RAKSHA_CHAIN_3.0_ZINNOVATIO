import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface Shipment {
  name: string
  id: string
  supply: string
  initLoc: string
  finalLoc: string
  date: string
  status?: string
  currentLocation?: string
  locationHistory?: Array<{
    location: string
    timestamp: string
    officer: string
    action: string
    coordinates?: [number, number]
  }>
}

interface LocationCoordinates {
  location: string
  coords: [number, number]
}

export default function LocationTrackingPage() {
  const { shipmentId } = useParams<{ shipmentId: string }>()
  const navigate = useNavigate()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [coordinates, setCoordinates] = useState<LocationCoordinates[]>([])
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null)
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([])
  const API_URL = 'http://localhost:5000/api'

  const fetchShipment = async () => {
    if (!shipmentId) return
    
    try {
      const response = await fetch(`${API_URL}/shipments/${shipmentId}`)
      if (!response.ok) throw new Error('Failed to fetch shipment')
      const data = await response.json()
      setShipment(data)
      
      // Geocode locations for map display
      await geocodeLocations(data)
    } catch (error) {
      console.error('Error fetching shipment:', error)
      alert('Failed to load shipment details')
    } finally {
      setLoading(false)
    }
  }

  const geocodeLocations = async (shipmentData: Shipment) => {
    try {
      // Geocode initial location
      const initResponse = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA0M2Y2MGI1MGVhYzQxZjNiNWNiZDNjMDllYWQ4YWM1IiwiaCI6Im11cm11cjY0In0=&text=${encodeURIComponent(shipmentData.initLoc)}&size=1`
      )
      const initData = await initResponse.json()
      const initCoords: [number, number] = initData.features?.[0]?.geometry?.coordinates || null

      // Geocode final location
      const finalResponse = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA0M2Y2MGI1MGVhYzQxZjNiNWNiZDNjMDllYWQ4YWM1IiwiaCI6Im11cm11cjY0In0=&text=${encodeURIComponent(shipmentData.finalLoc)}&size=1`
      )
      const finalData = await finalResponse.json()
      const finalCoords: [number, number] = finalData.features?.[0]?.geometry?.coordinates || null

      if (initCoords && finalCoords) {
        setRouteCoords([initCoords, finalCoords])
        setCoordinates([
          { location: shipmentData.initLoc, coords: initCoords },
          { location: shipmentData.finalLoc, coords: finalCoords }
        ])
      }

      // Geocode current location
      if (shipmentData.currentLocation) {
        try {
          const currentResponse = await fetch(
            `https://api.openrouteservice.org/geocode/search?api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA0M2Y2MGI1MGVhYzQxZjNiNWNiZDNjMDllYWQ4YWM1IiwiaCI6Im11cm11cjY0In0=&text=${encodeURIComponent(shipmentData.currentLocation)}&size=1`
          )
          const currentData = await currentResponse.json()
          const current = currentData.features?.[0]?.geometry?.coordinates
          if (current) {
            setCurrentCoords(current)
          }
        } catch (e) {
          console.warn('Failed to geocode current location:', e)
        }
      }

      // Geocode location history
      if (shipmentData.locationHistory && shipmentData.locationHistory.length > 0) {
        const historyPromises = shipmentData.locationHistory.map(async (entry) => {
          if (entry.coordinates) return { location: entry.location, coords: entry.coordinates }
          try {
            const histResponse = await fetch(
              `https://api.openrouteservice.org/geocode/search?api_key=eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA0M2Y2MGI1MGVhYzQxZjNiNWNiZDNjMDllYWQ4YWM1IiwiaCI6Im11cm11cjY0In0=&text=${encodeURIComponent(entry.location)}&size=1`
            )
            const histData = await histResponse.json()
            const histCoords = histData.features?.[0]?.geometry?.coordinates
            return histCoords ? { location: entry.location, coords: histCoords } : null
          } catch (e) {
            return null
          }
        })
        const historyResults = await Promise.all(historyPromises)
        const validHistory = historyResults.filter(Boolean) as LocationCoordinates[]
        setCoordinates(prev => [...prev, ...validHistory.filter(h => !prev.some(p => p.location === h.location))])
      }
    } catch (error) {
      console.error('Error geocoding locations:', error)
    }
  }

  useEffect(() => {
    if (!shipmentId) return
    fetchShipment()
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchShipment, 5000)
    return () => clearInterval(interval)
  }, [shipmentId])

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

  if (loading) {
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
          Loading tracking data...
        </p>
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white flex items-center justify-center">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `linear-gradient(to right, #262626 1px, transparent 1px),linear-gradient(to bottom, #262626 1px, transparent 1px)`,
            backgroundSize: "20px 20px",
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '20px' }}>
            Shipment not found
          </p>
          <button onClick={() => navigate('/dispatch')} style={buttonStyle}>
            Back to Dispatch
          </button>
        </div>
      </div>
    )
  }

  // Calculate map center
  const mapCenter: [number, number] = currentCoords || 
    (coordinates.length > 0 ? coordinates[0].coords : [20.5937, 78.9629]) // Default to India center

  return (
    <div className="min-h-screen w-full bg-[#0f0f0f] relative text-white">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `linear-gradient(to right, #262626 1px, transparent 1px),linear-gradient(to bottom, #262626 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      
      <section className="flex flex-col items-center px-4 relative z-10" style={{ minHeight: '100vh', paddingTop: '40px', paddingBottom: '40px' }}>
        <div className="max-w-[1400px] w-full">
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <div>
              <h1 style={{ fontFamily: '"Orbitron", sans-serif', fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', color: 'rgb(242,242,242)', fontWeight: 700, marginBottom: '8px' }}>
                Live Location Tracking
              </h1>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
                {shipment.name} • ID: {shipment.id}
              </p>
            </div>
            <button onClick={() => navigate('/dispatch')} style={buttonStyle}>
              Back to Dispatch
            </button>
          </div>

          {/* Info Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '20px'
            }}>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>CURRENT LOCATION</p>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: '#fff', fontWeight: 600 }}>
                {shipment.currentLocation || shipment.initLoc}
              </p>
            </div>
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '20px'
            }}>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>DESTINATION</p>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: '#fff', fontWeight: 600 }}>
                {shipment.finalLoc}
              </p>
            </div>
            <div style={{
              border: '2.5px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '20px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              padding: '20px'
            }}>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '8px' }}>STATUS</p>
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: shipment.status === 'received' ? '#00ff00' : '#ffff00', fontWeight: 600 }}>
                {shipment.status === 'received' ? 'Received' : 'In Transit'}
              </p>
            </div>
          </div>

          {/* Map */}
          <div style={{
            border: '2.5px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '12px',
            marginBottom: '24px',
            height: '500px',
            overflow: 'hidden'
          }}>
            <MapContainer
              center={mapCenter}
              zoom={6}
              style={{ height: '100%', width: '100%', borderRadius: '12px', zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Route line */}
              {routeCoords.length === 2 && (
                <Polyline
                  positions={routeCoords}
                  color="#0099ff"
                  weight={3}
                  opacity={0.6}
                />
              )}

              {/* Initial location marker */}
              {coordinates.find(c => c.location === shipment.initLoc) && (
                <Marker position={coordinates.find(c => c.location === shipment.initLoc)!.coords}>
                  <Popup>
                    <div style={{ fontFamily: '"Source Code Pro", monospace' }}>
                      <strong>Origin:</strong> {shipment.initLoc}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Final location marker */}
              {coordinates.find(c => c.location === shipment.finalLoc) && (
                <Marker position={coordinates.find(c => c.location === shipment.finalLoc)!.coords}>
                  <Popup>
                    <div style={{ fontFamily: '"Source Code Pro", monospace' }}>
                      <strong>Destination:</strong> {shipment.finalLoc}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Current location marker */}
              {currentCoords && (
                <Marker position={currentCoords}>
                  <Popup>
                    <div style={{ fontFamily: '"Source Code Pro", monospace' }}>
                      <strong>Current Location:</strong> {shipment.currentLocation}
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Location History Timeline */}
          <div style={{
            border: '2.5px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            padding: '24px'
          }}>
            <h2 style={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: 'clamp(1.2rem, 2.2vw, 1.5rem)',
              color: '#fff',
              fontWeight: 700,
              marginBottom: '24px'
            }}>
              Location History
            </h2>
            
            {shipment.locationHistory && shipment.locationHistory.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[...shipment.locationHistory].reverse().map((entry, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)'
                    }}
                  >
                    <div style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: entry.action === 'dispatched' ? '#00ff00' : entry.action === 'verified' ? '#0099ff' : '#ffff00',
                      marginTop: '4px',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                        <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '16px', color: '#fff', fontWeight: 600 }}>
                          {entry.location}
                        </p>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: entry.action === 'dispatched' ? 'rgba(0, 255, 0, 0.2)' : entry.action === 'verified' ? 'rgba(0, 153, 255, 0.2)' : 'rgba(255, 255, 0, 0.2)',
                          color: entry.action === 'dispatched' ? '#00ff00' : entry.action === 'verified' ? '#0099ff' : '#ffff00',
                          fontSize: '12px',
                          fontFamily: '"Source Code Pro", monospace',
                          textTransform: 'capitalize'
                        }}>
                          {entry.action}
                        </span>
                      </div>
                      <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '13px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                        Officer: {entry.officer}
                      </p>
                      <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '13px', color: 'rgba(255, 255, 255, 0.5)' }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: '"Source Code Pro", monospace', fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                No location history available yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

