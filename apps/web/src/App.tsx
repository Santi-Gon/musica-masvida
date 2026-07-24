import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home/Home';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Instruments } from './pages/Instruments/Instruments';
import { Teachers } from './pages/Teachers/Teachers';
import { Pricing } from './pages/Pricing/Pricing';
import { Events } from './pages/Events/Events';
import { Location } from './pages/Location/Location';
import { History } from './pages/History/History';
import { Terms } from './pages/Terms/Terms';

function App() {
  return (
    <Routes>
      {/* Pages with Navbar + Footer */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/instrumentos" element={<Instruments />} />
        <Route path="/maestros" element={<Teachers />} />
        <Route path="/precios" element={<Pricing />} />
        <Route path="/eventos" element={<Events />} />
        <Route path="/ubicacion" element={<Location />} />
        <Route path="/historia" element={<History />} />
        <Route path="/terminos" element={<Terms />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      {/* Pages WITHOUT Navbar/Footer (standalone) */}
      <Route path="/login" element={<Login />} />

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
