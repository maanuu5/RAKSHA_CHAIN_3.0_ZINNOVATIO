const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
// Allow overriding the port via environment variable to avoid EADDRINUSE on hardcoded ports
const PORT = process.env.PORT || 5000;
const SHIPMENTS_FILE = path.join(__dirname, 'shipments.json');
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjA0M2Y2MGI1MGVhYzQxZjNiNWNiZDNjMDllYWQ4YWM1IiwiaCI6Im11cm11cjY0In0=';

// Prefer built-in fetch (Node 18+). If unavailable, try node-fetch dynamically.
let _fetch = global.fetch;
if (typeof _fetch !== 'function') {
  try {
    // Use node-fetch v2 (CommonJS) for compatibility with require()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _fetch = require('node-fetch');
  } catch (_) {
    _fetch = null;
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Initialize shipments.json if it doesn't exist
async function initializeShipmentsFile() {
  try {
    await fs.access(SHIPMENTS_FILE);
  } catch {
    await fs.writeFile(SHIPMENTS_FILE, JSON.stringify([], null, 2));
    console.log('Created shipments.json file');
  }
}

// Read shipments from file
async function readShipments() {
  try {
    const data = await fs.readFile(SHIPMENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading shipments:', error);
    return [];
  }
}

// Write shipments to file
async function writeShipments(shipments) {
  try {
    await fs.writeFile(SHIPMENTS_FILE, JSON.stringify(shipments, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing shipments:', error);
    return false;
  }
}

// GET all shipments
app.get('/api/shipments', async (req, res) => {
  try {
    const shipments = await readShipments();
    res.json(shipments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
});

// GET single shipment by ID
app.get('/api/shipments/:id', async (req, res) => {
  try {
    const shipments = await readShipments();
    const shipment = shipments.find(s => s.id === req.params.id);
    
    if (!shipment) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    res.json(shipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
});

// POST create new shipment
app.post('/api/shipments', async (req, res) => {
  try {
    const { name, id, supply, initLoc, finalLoc, date } = req.body;
    
    // Validate required fields
    if (!name || !id || !supply || !initLoc || !finalLoc || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    const shipments = await readShipments();
    
    // Check if ID already exists
    if (shipments.some(s => s.id === id)) {
      return res.status(400).json({ error: 'Shipment ID already exists' });
    }
    
    const newShipment = {
      name,
      id,
      supply,
      initLoc,
      finalLoc,
      date,
      status: 'pending',
      currentLocation: initLoc,
      locationHistory: [{
        location: initLoc,
        timestamp: new Date().toISOString(),
        officer: 'System',
        action: 'dispatched'
      }]
    };
    
    shipments.push(newShipment);
    const success = await writeShipments(shipments);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to save shipment' });
    }
    
    res.status(201).json(newShipment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create shipment' });
  }
});

// PUT update shipment
app.put('/api/shipments/:id', async (req, res) => {
  try {
    console.log('Received PUT request for shipment:', req.params.id);
    console.log('Request body:', req.body);
    
    const { name, supply, initLoc, finalLoc, date, status, location, officer, action } = req.body;
    const shipments = await readShipments();
    const index = shipments.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      console.log('Shipment not found with ID:', req.params.id);
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    // Update shipment (keep the original ID)
    const currentShipment = shipments[index];
    console.log('Current shipment:', currentShipment);
    
    // Initialize location tracking if not exists
    let locationHistory = currentShipment.locationHistory || [{
      location: currentShipment.initLoc,
      timestamp: new Date().toISOString(),
      officer: 'System',
      action: 'dispatched'
    }];
    
    // If location update is provided, add to history
    if (location) {
      locationHistory.push({
        location: location,
        timestamp: new Date().toISOString(),
        officer: officer || 'Unknown',
        action: action || 'checked_in'
      });
    }
    
    shipments[index] = {
      ...currentShipment,
      name: name || currentShipment.name,
      supply: supply || currentShipment.supply,
      initLoc: initLoc || currentShipment.initLoc,
      finalLoc: finalLoc || currentShipment.finalLoc,
      date: date || currentShipment.date,
      status: status || currentShipment.status || 'pending', // Use provided status, fallback to current, or default to pending
      currentLocation: location || currentShipment.currentLocation || currentShipment.initLoc,
      locationHistory: locationHistory
    };
    
    console.log('Updated shipment:', shipments[index]);
    
    const success = await writeShipments(shipments);
    
    if (!success) {
      console.error('Failed to write shipments to file');
      return res.status(500).json({ error: 'Failed to update shipment' });
    }
    
    console.log('Successfully updated shipment');
    res.json(shipments[index]);
  } catch (error) {
    console.error('Error updating shipment:', error);
    res.status(500).json({ error: 'Failed to update shipment' });
  }
});

// POST update shipment location
app.post('/api/shipments/:id/location', async (req, res) => {
  try {
    const { location, officer, action, coordinates } = req.body;
    const shipments = await readShipments();
    const index = shipments.findIndex(s => s.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }
    
    const currentShipment = shipments[index];
    const locationHistory = currentShipment.locationHistory || [{
      location: currentShipment.initLoc,
      timestamp: new Date().toISOString(),
      officer: 'System',
      action: 'dispatched'
    }];
    
    // Add new location entry
    const locationUpdate = {
      location: location,
      timestamp: new Date().toISOString(),
      officer: officer || 'Unknown',
      action: action || 'checked_in',
      coordinates: coordinates || null
    };
    
    locationHistory.push(locationUpdate);
    
    shipments[index] = {
      ...currentShipment,
      currentLocation: location,
      locationHistory: locationHistory
    };
    
    const success = await writeShipments(shipments);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update location' });
    }
    
    res.json({ success: true, location: locationUpdate, shipment: shipments[index] });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// DELETE shipment
app.delete('/api/shipments/:id', async (req, res) => {
  try {
    const shipments = await readShipments();
    const filteredShipments = shipments.filter(s => s.id !== req.params.id);
    
    if (shipments.length === filteredShipments.length) {
      return res.status(404).json({ error: 'Shipment not found' });
    }
    
    const success = await writeShipments(filteredShipments);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete shipment' });
    }
    
    res.json({ message: 'Shipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
});

// --- Helpers for OpenRouteService ---
async function geocodeLocation(text) {
  if (!_fetch) throw new Error('fetch is not available on this Node version');
  const url = `https://api.openrouteservice.org/geocode/search?api_key=${encodeURIComponent(ORS_API_KEY)}&text=${encodeURIComponent(text)}&size=1`;
  const resp = await _fetch(url);
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Geocode failed: ${resp.status} ${t}`);
  }
  const data = await resp.json();
  if (!data.features || !data.features.length) throw new Error(`Location not found: ${text}`);
  const feat = data.features[0];
  return { coords: feat.geometry.coordinates, name: feat.properties.label };
}

async function getRouteORS(startCoords, endCoords, profile) {
  if (!_fetch) throw new Error('fetch is not available on this Node version');
  const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
  const resp = await _fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8',
      'Authorization': ORS_API_KEY,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({ coordinates: [startCoords, endCoords] })
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Route failed: ${resp.status} ${t}`);
  }
  return await resp.json();
}

function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function formatDistance(meters) {
  const km = (Number(meters) || 0) / 1000;
  return `${km.toFixed(2)} km`;
}

// POST /api/estimate  { startLocation, endLocation, mode }
app.post('/api/estimate', async (req, res) => {
  try {
    const { startLocation, endLocation, mode } = req.body || {};
    if (!startLocation || !endLocation) return res.status(400).json({ error: 'startLocation and endLocation are required' });
    const profile = mode || 'driving-car';

    const start = await geocodeLocation(startLocation);
    const end = await geocodeLocation(endLocation);
    const data = await getRouteORS(start.coords, end.coords, profile);

    if (!data.routes || !data.routes.length) return res.status(404).json({ error: 'No route found' });
    const route = data.routes[0];
    const duration = route.summary && route.summary.duration ? route.summary.duration : 0;
    const distance = route.summary && route.summary.distance ? route.summary.distance : 0;

    return res.json({
      startName: start.name,
      endName: end.name,
      duration,
      distance,
      durationFormatted: formatDuration(duration),
      distanceFormatted: formatDistance(distance),
      profile
    });
  } catch (e) {
    return res.status(500).json({ error: e && e.message ? e.message : 'Failed to estimate travel time' });
  }
});

// GET /api/shipments/:id/estimate?mode=driving-car
app.get('/api/shipments/:id/estimate', async (req, res) => {
  try {
    const profile = req.query.mode || 'driving-car';
    const shipments = await readShipments();
    const shipment = shipments.find(s => s.id === req.params.id);
    if (!shipment) return res.status(404).json({ error: 'Shipment not found' });
    if (!shipment.initLoc || !shipment.finalLoc) return res.status(400).json({ error: 'Shipment lacks initLoc/finalLoc' });

    const start = await geocodeLocation(shipment.initLoc);
    const end = await geocodeLocation(shipment.finalLoc);
    const data = await getRouteORS(start.coords, end.coords, profile);

    if (!data.routes || !data.routes.length) return res.status(404).json({ error: 'No route found' });
    const route = data.routes[0];
    const duration = route.summary && route.summary.duration ? route.summary.duration : 0;
    const distance = route.summary && route.summary.distance ? route.summary.distance : 0;

    return res.json({
      shipmentId: shipment.id,
      startName: start.name,
      endName: end.name,
      duration,
      distance,
      durationFormatted: formatDuration(duration),
      distanceFormatted: formatDistance(distance),
      profile
    });
  } catch (e) {
    return res.status(500).json({ error: e && e.message ? e.message : 'Failed to estimate travel time for shipment' });
  }
});

// ===== ANALYTICS API ENDPOINTS =====

// GET analytics overview
app.get('/api/analytics/overview', async (req, res) => {
  try {
    const shipments = await readShipments();
    
    const total = shipments.length;
    const pending = shipments.filter(s => s.status === 'pending' || !s.status).length;
    const inTransit = shipments.filter(s => s.status && s.status !== 'received' && s.status !== 'pending').length;
    const received = shipments.filter(s => s.status === 'received').length;
    const tampered = shipments.filter(s => s.status === 'tampered').length;
    
    // Status breakdown
    const statusBreakdown = {
      pending,
      inTransit,
      received,
      tampered
    };
    
    // Location statistics
    const locationStats = {};
    shipments.forEach(shipment => {
      const location = shipment.currentLocation || shipment.initLoc;
      locationStats[location] = (locationStats[location] || 0) + 1;
    });
    
    // Supply type statistics
    const supplyStats = {};
    shipments.forEach(shipment => {
      const supply = shipment.supply || 'Unknown';
      supplyStats[supply] = (supplyStats[supply] || 0) + 1;
    });
    
    // Date-based statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentShipments = shipments.filter(s => {
      if (!s.date) return false;
      const shipmentDate = new Date(s.date);
      return shipmentDate >= thirtyDaysAgo;
    });
    
    // Average delivery time calculation (for received shipments)
    let totalDeliveryTime = 0;
    let deliveredCount = 0;
    
    shipments.forEach(shipment => {
      if (shipment.status === 'received') {
        let startTime = null;
        let endTime = null;
        
        // Try to get time from location history first
        if (shipment.locationHistory && shipment.locationHistory.length > 1) {
          const firstLocation = shipment.locationHistory[0];
          const lastLocation = shipment.locationHistory[shipment.locationHistory.length - 1];
          
          if (firstLocation.timestamp && lastLocation.timestamp) {
            startTime = new Date(firstLocation.timestamp);
            endTime = new Date(lastLocation.timestamp);
          }
        }
        
        // Fallback: use shipment date as start time if no location history timestamps
        if (!startTime && shipment.date) {
          startTime = new Date(shipment.date);
        }
        
        // Use current time as end time if shipment is received but no end timestamp
        if (startTime && !endTime && shipment.status === 'received') {
          endTime = new Date(); // Current time as approximation
        }
        
        if (startTime && endTime) {
          const diffHours = (endTime - startTime) / (1000 * 60 * 60);
          // Valid range: 0 to 30 days (720 hours)
          if (diffHours > 0 && diffHours < 720) {
            totalDeliveryTime += diffHours;
            deliveredCount++;
          }
        }
      }
    });
    
    const avgDeliveryHours = deliveredCount > 0 ? (totalDeliveryTime / deliveredCount).toFixed(1) : 0;
    
    res.json({
      total,
      statusBreakdown,
      locationStats,
      supplyStats,
      recentShipmentsCount: recentShipments.length,
      avgDeliveryHours: parseFloat(avgDeliveryHours),
      deliveredCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error calculating analytics:', error);
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
});

// GET analytics by date range
app.get('/api/analytics/timeline', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const shipments = await readShipments();
    
    let filteredShipments = shipments;
    
    if (startDate || endDate) {
      filteredShipments = shipments.filter(s => {
        if (!s.date) return false;
        const shipmentDate = new Date(s.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        
        if (start && shipmentDate < start) return false;
        if (end && shipmentDate > end) return false;
        return true;
      });
    }
    
    // Group by date
    const dateGroups = {};
    filteredShipments.forEach(shipment => {
      const date = shipment.date || 'Unknown';
      if (!dateGroups[date]) {
        dateGroups[date] = {
          date,
          total: 0,
          pending: 0,
          inTransit: 0,
          received: 0,
          tampered: 0
        };
      }
      dateGroups[date].total++;
      
      const status = shipment.status || 'pending';
      if (status === 'received') dateGroups[date].received++;
      else if (status === 'tampered') dateGroups[date].tampered++;
      else if (status === 'pending') dateGroups[date].pending++;
      else dateGroups[date].inTransit++;
    });
    
    const timeline = Object.values(dateGroups).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    res.json({ timeline });
  } catch (error) {
    console.error('Error calculating timeline:', error);
    res.status(500).json({ error: 'Failed to calculate timeline' });
  }
});

// GET route performance analytics
app.get('/api/analytics/routes', async (req, res) => {
  try {
    const shipments = await readShipments();
    
    // Group by route (initLoc -> finalLoc)
    const routeStats = {};
    
    shipments.forEach(shipment => {
      const route = `${shipment.initLoc} → ${shipment.finalLoc}`;
      
      if (!routeStats[route]) {
        routeStats[route] = {
          route,
          initLoc: shipment.initLoc,
          finalLoc: shipment.finalLoc,
          total: 0,
          completed: 0,
          inProgress: 0,
          avgDeliveryHours: 0,
          deliveryTimes: []
        };
      }
      
      routeStats[route].total++;
      
      if (shipment.status === 'received') {
        routeStats[route].completed++;
        
        // Calculate delivery time if available
        if (shipment.locationHistory && shipment.locationHistory.length > 1) {
          const firstLocation = shipment.locationHistory[0];
          const lastLocation = shipment.locationHistory[shipment.locationHistory.length - 1];
          
          if (firstLocation.timestamp && lastLocation.timestamp) {
            const startTime = new Date(firstLocation.timestamp);
            const endTime = new Date(lastLocation.timestamp);
            const diffHours = (endTime - startTime) / (1000 * 60 * 60);
            if (diffHours > 0 && diffHours < 720) {
              routeStats[route].deliveryTimes.push(diffHours);
            }
          }
        }
      } else if (shipment.status !== 'pending' && shipment.status !== 'tampered') {
        routeStats[route].inProgress++;
      }
    });
    
    // Calculate averages
    Object.values(routeStats).forEach(route => {
      if (route.deliveryTimes.length > 0) {
        const sum = route.deliveryTimes.reduce((a, b) => a + b, 0);
        route.avgDeliveryHours = parseFloat((sum / route.deliveryTimes.length).toFixed(1));
      }
      delete route.deliveryTimes; // Remove raw data, keep only average
    });
    
    const routes = Object.values(routeStats).sort((a, b) => b.total - a.total);
    
    res.json({ routes });
  } catch (error) {
    console.error('Error calculating route analytics:', error);
    res.status(500).json({ error: 'Failed to calculate route analytics' });
  }
});

// GET checkpoint performance
app.get('/api/analytics/checkpoints', async (req, res) => {
  try {
    const shipments = await readShipments();
    
    // Analyze location history to get checkpoint activity
    const checkpointStats = {};
    
    shipments.forEach(shipment => {
      if (shipment.locationHistory) {
        shipment.locationHistory.forEach((entry, index) => {
          const location = entry.location;
          
          if (!checkpointStats[location]) {
            checkpointStats[location] = {
              location,
              totalScans: 0,
              uniqueShipments: new Set(),
              officers: new Set(),
              avgTimeBetweenScans: 0
            };
          }
          
          checkpointStats[location].totalScans++;
          checkpointStats[location].uniqueShipments.add(shipment.id);
          if (entry.officer) {
            checkpointStats[location].officers.add(entry.officer);
          }
        });
      }
    });
    
    // Convert Sets to counts and format
    const checkpoints = Object.values(checkpointStats).map(stat => ({
      location: stat.location,
      totalScans: stat.totalScans,
      uniqueShipments: stat.uniqueShipments.size,
      officersCount: stat.officers.size
    })).sort((a, b) => b.totalScans - a.totalScans);
    
    res.json({ checkpoints });
  } catch (error) {
    console.error('Error calculating checkpoint analytics:', error);
    res.status(500).json({ error: 'Failed to calculate checkpoint analytics' });
  }
});

// Initialize and start server
initializeShipmentsFile().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Shipments file: ${SHIPMENTS_FILE}`);
  });
});