import { Music, Play, Users, Calendar, MapPin, ChevronRight, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar */}
      <header style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '1rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--color-primary)' }}>
          <Music size={32} />
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--color-text-main)' }}>Música Más Vida</h1>
        </div>
        
        <nav style={{ display: 'none', gap: '2rem' }} className="desktop-nav">
          <a href="#instrumentos" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Instrumentos</a>
          <a href="#maestros" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Maestros</a>
          <a href="#precios" style={{ color: 'var(--color-text-main)', textDecoration: 'none', fontWeight: 500 }}>Precios</a>
        </nav>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/login')}
            style={{ 
              backgroundColor: 'transparent', 
              border: 'none', 
              color: 'var(--color-text-main)', 
              fontWeight: 600,
              cursor: 'pointer' 
            }}
          >
            Iniciar Sesión
          </button>
          <button className="btn-primary">
            Inscríbete Hoy
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1 }}>
        <section style={{
          padding: '6rem 2rem',
          textAlign: 'center',
          backgroundColor: 'var(--color-bg-base)',
          backgroundImage: 'radial-gradient(var(--color-border) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}>
          <h2 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', maxWidth: '800px', margin: '0 auto 1.5rem auto', lineHeight: 1.2 }}>
            Descubre tu pasión por la <span style={{ color: 'var(--color-primary)' }}>Música</span>
          </h2>
          <p style={{ fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto 3rem auto', color: 'var(--color-text-muted)' }}>
            Aprende a tocar el instrumento de tus sueños con maestros expertos en un ambiente inspirador. Clases personalizadas para todas las edades y niveles.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.125rem' }}>
              <Play size={20} />
              Conoce los Planes
            </button>
            <button style={{
              backgroundColor: 'var(--color-bg-surface)',
              color: 'var(--color-text-main)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '1rem 2rem',
              fontSize: '1.125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              Ver Instalaciones
            </button>
          </div>
        </section>

        {/* Features / Quick Links */}
        <section style={{ padding: '4rem 2rem', backgroundColor: 'var(--color-bg-surface)' }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem'
          }}>
            {[
              { icon: <Music />, title: 'Múltiples Instrumentos', desc: 'Piano, guitarra, violín, batería y más.' },
              { icon: <Users />, title: 'Maestros Expertos', desc: 'Profesionales activos en la industria musical.' },
              { icon: <Calendar />, title: 'Horarios Flexibles', desc: 'Clases adaptadas a tu rutina diaria.' },
              { icon: <MapPin />, title: 'Excelente Ubicación', desc: 'Instalaciones de primer nivel.' }
            ].map((feature, idx) => (
              <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ 
                  backgroundColor: 'var(--color-bg-base)', 
                  padding: '1rem', 
                  borderRadius: '12px', 
                  color: 'var(--color-primary)',
                  marginBottom: '1.5rem'
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{feature.title}</h3>
                <p style={{ margin: 0, fontSize: '0.95rem' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: 'var(--color-text-main)',
        color: 'white',
        padding: '3rem 2rem',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
          <Music size={24} />
          <h2 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>Música Más Vida</h2>
        </div>
        <p style={{ color: '#A0AEC0', fontSize: '0.9rem' }}>© 2026 Música Más Vida. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
