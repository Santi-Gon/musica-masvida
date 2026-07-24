import { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import { eventsApi, type WebEvent } from '../../services/api';
import './Events.css';

const CATEGORY_COLORS: Record<string, string> = {
  Recital: '#8B5CF6',
  Masterclass: '#3B82F6',
  Taller: '#10B981',
  'Evento Social': '#F59E0B',
  Evaluación: '#EF4444',
  Festival: '#EC4899',
};

export function Events() {
  const [events, setEvents] = useState<WebEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi.getPublicEvents()
      .then(data => setEvents(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="events-page">
      <section className="page-header">
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <Calendar size={14} /> Calendario
          </div>
          <h1 className="section-title">Próximos Eventos</h1>
          <p className="section-subtitle">
            No te pierdas nuestros recitales, talleres, masterclasses y eventos especiales.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Cargando eventos...</p>
            </div>
          ) : events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <Calendar size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
              <h3>Pronto anunciaremos nuevos eventos</h3>
              <p style={{ color: 'var(--text-muted)' }}>Mantente al tanto de nuestras redes sociales para más novedades.</p>
            </div>
          ) : (
            <div className="events-list">
              {events.map((event) => {
                // Determine a category based on the title (simple heuristic since category is not in DB)
                let category = 'Evento General';
                if (event.title.toLowerCase().includes('recital')) category = 'Recital';
                else if (event.title.toLowerCase().includes('masterclass')) category = 'Masterclass';
                else if (event.title.toLowerCase().includes('taller')) category = 'Taller';
                else if (event.title.toLowerCase().includes('festival')) category = 'Festival';
                
                return (
                  <div key={event.id} className="card-static event-card">
                    <div
                      className="event-card__accent"
                      style={{ backgroundColor: CATEGORY_COLORS[category] || 'var(--color-primary)' }}
                    />
                    <div className="event-card__content">
                      <div className="event-card__header">
                        <span
                          className="event-card__category"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[category] || 'var(--color-primary)'}15`,
                            color: CATEGORY_COLORS[category] || 'var(--color-primary)',
                            border: `1px solid ${CATEGORY_COLORS[category] || 'var(--color-primary)'}30`,
                          }}
                        >
                          {category}
                        </span>
                        <span className="event-card__spots">
                          <Users size={14} />
                          Abierto al público
                        </span>
                      </div>
                      <h3>{event.title}</h3>
                      <p className="event-card__desc">{event.description}</p>
                      <div className="event-card__meta">
                        <div className="event-card__meta-item">
                          <Calendar size={15} />
                          <span>{new Date(event.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="event-card__meta-item">
                          <Clock size={15} />
                          <span>{event.time}</span>
                        </div>
                        <div className="event-card__meta-item">
                          <MapPin size={15} />
                          <span>{event.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
