import { Calendar, MapPin, Clock, Users } from 'lucide-react';
import './Events.css';

const EVENTS = [
  {
    title: 'Recital de Fin de Semestre',
    date: '15 de Agosto, 2026',
    time: '18:00 - 20:00',
    location: 'Auditorio Principal',
    description: 'Nuestros alumnos presentarán las piezas que han preparado durante el semestre. Evento abierto al público.',
    category: 'Recital',
    spots: 'Entrada libre',
  },
  {
    title: 'Masterclass de Jazz con Invitado Especial',
    date: '22 de Agosto, 2026',
    time: '16:00 - 18:00',
    location: 'Sala de Ensayos A',
    description: 'Clase magistral de improvisación jazz con el reconocido saxofonista Ernesto Morales. Cupo limitado.',
    category: 'Masterclass',
    spots: '20 lugares',
  },
  {
    title: 'Taller de Producción Musical',
    date: '5 de Septiembre, 2026',
    time: '10:00 - 14:00',
    location: 'Estudio Digital',
    description: 'Aprende los fundamentos de la producción musical con software profesional. Incluye licencia temporal de Ableton Live.',
    category: 'Taller',
    spots: '15 lugares',
  },
  {
    title: 'Noche de Música en Vivo',
    date: '12 de Septiembre, 2026',
    time: '19:00 - 22:00',
    location: 'Terraza Música Más Vida',
    description: 'Una noche especial con presentaciones de alumnos avanzados y maestros. Incluye cena y bebidas.',
    category: 'Evento Social',
    spots: '50 lugares',
  },
  {
    title: 'Examen de Certificación - Nivel Básico',
    date: '20 de Septiembre, 2026',
    time: '09:00 - 13:00',
    location: 'Todas las salas',
    description: 'Evaluación oficial para obtener la certificación de Nivel Básico en tu instrumento.',
    category: 'Evaluación',
    spots: 'Solo alumnos registrados',
  },
  {
    title: 'Festival Musical de Otoño',
    date: '10 de Octubre, 2026',
    time: '11:00 - 20:00',
    location: 'Plaza Central',
    description: 'Festival al aire libre con presentaciones, talleres express, zona de prueba de instrumentos y food trucks.',
    category: 'Festival',
    spots: 'Entrada libre',
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Recital: '#8B5CF6',
  Masterclass: '#3B82F6',
  Taller: '#10B981',
  'Evento Social': '#F59E0B',
  Evaluación: '#EF4444',
  Festival: '#EC4899',
};

export function Events() {
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
          <div className="events-list">
            {EVENTS.map((event, idx) => (
              <div key={idx} className="card-static event-card">
                <div
                  className="event-card__accent"
                  style={{ backgroundColor: CATEGORY_COLORS[event.category] || 'var(--color-primary)' }}
                />
                <div className="event-card__content">
                  <div className="event-card__header">
                    <span
                      className="event-card__category"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[event.category] || 'var(--color-primary)'}15`,
                        color: CATEGORY_COLORS[event.category] || 'var(--color-primary)',
                        border: `1px solid ${CATEGORY_COLORS[event.category] || 'var(--color-primary)'}30`,
                      }}
                    >
                      {event.category}
                    </span>
                    <span className="event-card__spots">
                      <Users size={14} />
                      {event.spots}
                    </span>
                  </div>
                  <h3>{event.title}</h3>
                  <p className="event-card__desc">{event.description}</p>
                  <div className="event-card__meta">
                    <div className="event-card__meta-item">
                      <Calendar size={15} />
                      <span>{event.date}</span>
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
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
