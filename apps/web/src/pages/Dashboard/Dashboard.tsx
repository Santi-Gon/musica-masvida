import React, { useState } from 'react';

export const Dashboard = () => {
  const [pin, setPin] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  // Para pruebas: configurar usuario mock
  const handleSetupUser = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/setup-user', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.accessToken);
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

  const handleGeneratePin = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:3000/api/v1/auth/smartwatch/generate-pin', {
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
        <div style={{ padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>Paso 2: Conectar Smartwatch</h2>
          <p>Genera un PIN seguro para iniciar sesión en tu reloj inteligente sin usar contraseñas.</p>
          <button onClick={handleGeneratePin} disabled={loading} style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1.1rem' }}>
            {loading ? 'Generando...' : 'Generar PIN'}
          </button>

          {setupMessage && <p style={{ color: 'green' }}>{setupMessage}</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}

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
      )}
    </div>
  );
};
