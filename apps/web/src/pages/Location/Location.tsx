import { MapPin, Phone, Mail, Clock, Compass } from 'lucide-react';
import './Location.css';

const SCHEDULE = [
  { day: 'Lunes a Viernes', hours: '9:00 AM - 9:00 PM' },
  { day: 'Sábado', hours: '9:00 AM - 3:00 PM' },
  { day: 'Domingo', hours: 'Cerrado' },
];

export function Location() {
  return (
    <div className="location-page">
      <section className="page-header">
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <MapPin size={14} /> Encuéntranos
          </div>
          <h1 className="section-title">Nuestra Ubicación</h1>
          <p className="section-subtitle">
            Visítanos y conoce nuestras instalaciones de primer nivel.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="location-grid">
            {/* Map */}
            <div className="location-map">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.661454803099!2d-99.16869568509407!3d19.427023686886!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff35f5bd1563%3A0x6c366f0e2de02ff7!2sPalacio%20de%20Bellas%20Artes!5e0!3m2!1ses!2smx!4v1624561234567!5m2!1ses!2smx"
                width="100%"
                height="100%"
                style={{ border: 0, borderRadius: 'var(--radius-lg)' }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Ubicación de Música Más Vida"
              />
            </div>

            {/* Info */}
            <div className="location-info">
              <div className="card-static location-info-card">
                <h3>Información de Contacto</h3>

                <div className="location-info__items">
                  <div className="location-info__item">
                    <div className="location-info__icon">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <strong>Dirección</strong>
                      <span>Av. Reforma #123, Col. Centro<br />CP 06000, Ciudad de México</span>
                    </div>
                  </div>

                  <div className="location-info__item">
                    <div className="location-info__icon">
                      <Phone size={20} />
                    </div>
                    <div>
                      <strong>Teléfono</strong>
                      <span>(555) 123-4567</span>
                    </div>
                  </div>

                  <div className="location-info__item">
                    <div className="location-info__icon">
                      <Mail size={20} />
                    </div>
                    <div>
                      <strong>Correo Electrónico</strong>
                      <span>info@musicamasvida.com</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-static location-info-card">
                <h3>
                  <Clock size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  Horarios de Atención
                </h3>
                <div className="location-schedule">
                  {SCHEDULE.map((item, idx) => (
                    <div key={idx} className="location-schedule__item">
                      <span className="location-schedule__day">{item.day}</span>
                      <span className="location-schedule__hours">{item.hours}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Compass size={18} />
                Cómo Llegar
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
