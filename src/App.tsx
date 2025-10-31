
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import DispatchPage from './pages/DispatchPage'
import CheckpointPage from './pages/CheckpointPage'
import Rakesh from './pages/Rakesh'
import Aryan from './pages/Aryan'
import Mohan from './pages/Mohan'
import AdminPage from './pages/AdminPage'
import ReceivingPage from './pages/ReceivingPage'
import LocationTrackingPage from './pages/LocationTrackingPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/checkpoint/login" element={<LoginPage />} />
        <Route path="/receiving/login" element={<LoginPage />} />
        <Route path="/dispatch" element={<DispatchPage />} />
  <Route path="/checkpoint" element={<CheckpointPage />} />
  <Route path="/checkpoint/rakesh" element={<Rakesh />} />
  <Route path="/checkpoint/aryan" element={<Aryan />} />
  <Route path="/checkpoint/mohan" element={<Mohan />} />
        <Route path="/receiving" element={<ReceivingPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/tracking/:shipmentId" element={<LocationTrackingPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App