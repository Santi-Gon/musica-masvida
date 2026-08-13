import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/layout/AdminLayout';
import Login     from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Events    from './pages/Events/Events';
import Teachers  from './pages/Teachers/Teachers';
import Pricing   from './pages/Pricing/Pricing';
import Users     from './pages/Users/Users';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="events"    element={<Events />} />
            <Route path="teachers"  element={<Teachers />} />
            <Route path="pricing"   element={<Pricing />} />
            <Route path="users"     element={<Users />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
