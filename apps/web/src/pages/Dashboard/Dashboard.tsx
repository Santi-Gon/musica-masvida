import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1`;

export const Dashboard = () => {
  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('accessToken'));
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrExpiresAt, setQrExpiresAt] = useState<string | null>(null);

  // Para pruebas: configurar usuario mock
  const handleSetupUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/setup-user`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('accessToken', data.accessToken);
        setToken(data.accessToken);
        setSetupMessage(data.message);
      } else {
        setError(data.message || 'Error al configurar usuario');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const handleGenerateQr = async () => {
    setLoading(true);
    setError(null);
    setQrCode(null);
    try {
      const res = await fetch(`${API_BASE}/auth/mobile-qr`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo generar el QR');
      }

      setQrCode(data.code);
      setQrExpiresAt(data.expiresAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/auth/smartwatch/generate-pin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok) {
        setPin(data.pin);
        setExpiresAt(new Date(data.expiresAt).toLocaleTimeString());
      } else {
        setError(data.message || 'Error al generar PIN');
      }
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Dashboard del Alumno</h1>
      
      {!token ? (
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
          <h2>Paso 1: Iniciar Sesión (Mock)</h2>
          <p>Para esta práctica, haz clic aquí para crear e iniciar sesión con un usuario de prueba.</p>
          <button onClick={handleSetupUser} disabled={loading} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {loading ? 'Cargando...' : 'Crear Usuario de Prueba'}
          </button>
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </div>
      ) : (
        <>
          <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '1rem' }}>
            <h2>Iniciar sesión en la app móvil</h2>
            <p>Genera un QR temporal y escanéalo desde Música Más Vida Mobile. El código vence en 5 minutos y solo se puede usar una vez.</p>
            <button onClick={handleGenerateQr} disabled={loading} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {loading ? 'Generando...' : 'Generar QR para Flutter'}
            </button>
            {qrCode && qrExpiresAt && (
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                <QRCodeSVG value={qrCode} size={220} level="M" />
                <p>Vence a las {new Date(qrExpiresAt).toLocaleTimeString()}.</p>
              </div>
            )}
          </div>

          <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Conectar Smartwatch</h2>
            <p>Genera un PIN para iniciar sesión en tu reloj inteligente sin usar contraseñas.</p>
            <button onClick={handleGeneratePin} disabled={loading} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}>
              {loading ? 'Generando...' : 'Generar PIN'}
            </button>
            {pin && (
              <div style={{ marginTop: '2rem', textAlign: 'center', background: '#f3f4f6', padding: '2rem', borderRadius: '12px' }}>
                <h3>Tu PIN de acceso</h3>
                <div style={{ fontSize: '4rem', fontWeight: 'bold', letterSpacing: '0.5rem', color: '#1f2937', margin: '1rem 0' }}>
                  {pin}
                </div>
                <p style={{ color: '#6b7280' }}>
                  Este PIN expirará a las <strong>{expiresAt}</strong> (en 10 minutos).
                </p>
              </div>
            )}
          </div>
          {setupMessage && <p style={{ color: 'green' }}>{setupMessage}</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
        </>
      )}
    </div>
  );
};
