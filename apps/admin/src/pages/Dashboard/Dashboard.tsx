import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader } from '../../components/layout/AdminLayout';
import { eventsApi, teachersApi, pricingApi, type AdminEvent, type Teacher, type PricingPlan } from '../../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents]   = useState<AdminEvent[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [plans, setPlans]     = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([eventsApi.getAll(), teachersApi.getAll(), pricingApi.getAll()])
      .then(([ev, te, pl]) => { setEvents(ev); setTeachers(te); setPlans(pl); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const activeEvents   = events.filter(e => e.isActive).length;
  const activeTeachers = teachers.filter(t => t.isActive).length;
  const activePlans    = plans.filter(p => p.isActive).length;

  const nextEvent = events
    .filter(e => new Date(e.date) >= new Date())
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  const stats = [
    { label: 'Eventos activos',   value: activeEvents,   icon: '🎵', cls: 'purple' },
    { label: 'Maestros activos',  value: activeTeachers, icon: '👨‍🏫', cls: 'gold'   },
    { label: 'Planes de precios', value: activePlans,    icon: '💰', cls: 'green'  },
    { label: 'Total eventos',     value: events.length,  icon: '📋', cls: 'blue'   },
  ];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Resumen general del sistema" />
      <div className="page-content">
        <div className="welcome-banner">
          <div className="welcome-text">
            <h2>¡Bienvenido, {user?.name?.split(' ')[0]}! 👋</h2>
            <p>Aquí tienes un resumen de tu plataforma Música Más Vida.</p>
          </div>
          <span className="welcome-emoji">🎼</span>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div className="stats-grid">
              {stats.map(s => (
                <div key={s.label} className="stat-card">
                  <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                  <div className="stat-info">
                    <div className="stat-value">{s.value}</div>
                    <div className="stat-label">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {/* Próximo evento */}
              <div className="card">
                <h3 style={{ marginBottom: '1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  🗓️ Próximo evento
                </h3>
                {nextEvent ? (
                  <div>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem', fontSize:'1rem' }}>
                      {nextEvent.title}
                    </p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      📅 {new Date(nextEvent.date).toLocaleDateString('es-MX', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                    </p>
                    <p style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>🕐 {nextEvent.time}</p>
                    <p style={{ fontSize: '0.85rem' }}>📍 {nextEvent.location}</p>
                  </div>
                ) : (
                  <p>No hay eventos próximos programados.</p>
                )}
              </div>

              {/* Maestros recientes */}
              <div className="card">
                <h3 style={{ marginBottom: '1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  👨‍🏫 Maestros recientes
                </h3>
                {teachers.length === 0 ? (
                  <p>No hay maestros registrados.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'0.625rem' }}>
                    {teachers.slice(0,4).map(t => (
                      <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                        <div className="sidebar-avatar" style={{ width:32, height:32, fontSize:'0.8rem' }}>
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:'0.875rem', fontWeight:600 }}>{t.name}</div>
                          <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                            {t.instruments.slice(0,2).join(', ')}
                          </div>
                        </div>
                        <span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft:'auto' }}>
                          {t.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
