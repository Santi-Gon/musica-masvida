import {
  Play, Users, Calendar, MapPin, ChevronRight, Star, Guitar,
  Piano, Drum, Mic, ArrowRight, Clock, Award, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PopupModal } from '../../components/ui/PopupModal';
import './Home.css';

const INSTRUMENTS_PREVIEW = [
  { icon: <Piano size={28} />, name: 'Piano', desc: 'Clásico y contemporáneo' },
  { icon: <Guitar size={28} />, name: 'Guitarra', desc: 'Acústica y eléctrica' },
  { icon: <Drum size={28} />, name: 'Batería', desc: 'Rock, jazz y más' },
  { icon: <Mic size={28} />, name: 'Canto', desc: 'Técnica vocal completa' },
];

const STATS = [
  { value: '500+', label: 'Alumnos activos' },
  { value: '15', label: 'Maestros expertos' },
  { value: '12', label: 'Instrumentos' },
  { value: '10+', label: 'Años de experiencia' },
];

const TESTIMONIALS = [
  {
    name: 'María García',
    role: 'Alumna de Piano',
    text: 'Música Más Vida cambió mi vida. Los maestros son increíbles y el ambiente es perfecto para aprender.',
    rating: 5,
  },
  {
    name: 'Carlos Mendoza',
    role: 'Padre de familia',
    text: 'Mis hijos esperan con ansias cada clase. La metodología es excelente y se adaptan a cada nivel.',
    rating: 5,
  },
  {
    name: 'Ana López',
    role: 'Alumna de Guitarra',
    text: 'En 6 meses aprendí más que en 2 años por mi cuenta. Los horarios flexibles me permitieron combinar con mi trabajo.',
    rating: 5,
  },
];

export function Home() {
  const navigate = useNavigate();

  return (
    <>
      <PopupModal delay={8000} />

      {/* ===== Hero Section ===== */}
      <section className="hero">
        <div className="hero__bg-pattern" aria-hidden="true" />
        <div className="container hero__inner">
          <div className="hero__content">
            <div className="badge badge-primary">
              <Star size={14} /> Escuela #1 en la ciudad
            </div>
            <h1 className="hero__title">
              Descubre tu pasión por la{' '}
              <span className="hero__title-accent">Música</span>
            </h1>
            <p className="hero__subtitle">
              Aprende a tocar el instrumento de tus sueños con maestros expertos en un
              ambiente inspirador. Clases personalizadas para todas las edades y niveles.
            </p>
            <div className="hero__actions">
              <button className="btn-primary btn-lg" onClick={() => navigate('/precios')}>
                <Play size={20} />
                Conoce los Planes
              </button>
              <button className="btn-secondary btn-lg" onClick={() => navigate('/ubicacion')}>
                Ver Instalaciones
              </button>
            </div>
          </div>
          <div className="hero__visual">
            <div className="hero__card hero__card--1 animate-float">
              <Piano size={32} />
              <span>Piano</span>
            </div>
            <div className="hero__card hero__card--2 animate-float" style={{ animationDelay: '0.5s' }}>
              <Guitar size={32} />
              <span>Guitarra</span>
            </div>
            <div className="hero__card hero__card--3 animate-float" style={{ animationDelay: '1s' }}>
              <Mic size={32} />
              <span>Canto</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Stats Bar ===== */}
      <section className="stats-bar">
        <div className="container">
          <div className="stats-bar__grid">
            {STATS.map((stat, idx) => (
              <div key={idx} className="stats-bar__item">
                <span className="stats-bar__value">{stat.value}</span>
                <span className="stats-bar__label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Instruments Preview ===== */}
      <section className="section" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <Award size={14} /> Programas de Estudio
          </div>
          <h2 className="section-title">Instrumentos que puedes aprender</h2>
          <p className="section-subtitle">
            Ofrecemos clases de los instrumentos más populares con métodos de enseñanza modernos.
          </p>
          <div className="grid-4">
            {INSTRUMENTS_PREVIEW.map((inst, idx) => (
              <div key={idx} className="card instrument-card" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="instrument-card__icon">{inst.icon}</div>
                <h3>{inst.name}</h3>
                <p>{inst.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <button className="btn-secondary" onClick={() => navigate('/instrumentos')}>
              Ver todos los instrumentos
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ===== Why Us ===== */}
      <section className="section why-us">
        <div className="container">
          <div className="why-us__grid">
            <div className="why-us__content">
              <div className="badge badge-primary" style={{ width: 'fit-content' }}>
                <Heart size={14} /> ¿Por qué elegirnos?
              </div>
              <h2 style={{ marginTop: '1rem' }}>Más que una escuela,<br />una comunidad musical</h2>
              <p style={{ marginTop: '1rem', fontSize: '1.05rem' }}>
                En Música Más Vida creemos que la música transforma vidas. Nuestro enfoque
                combina técnica profesional con pasión por la enseñanza.
              </p>
              <ul className="why-us__list">
                <li>
                  <Users size={20} />
                  <div>
                    <strong>Grupos reducidos</strong>
                    <span>Máximo 5 alumnos por clase para atención personalizada</span>
                  </div>
                </li>
                <li>
                  <Clock size={20} />
                  <div>
                    <strong>Horarios flexibles</strong>
                    <span>Clases de lunes a sábado en distintos horarios</span>
                  </div>
                </li>
                <li>
                  <Award size={20} />
                  <div>
                    <strong>Certificación oficial</strong>
                    <span>Recibe un certificado al completar cada nivel</span>
                  </div>
                </li>
              </ul>
            </div>
            <div className="why-us__visual">
              <div className="why-us__image-placeholder">
                <div className="why-us__image-overlay">
                  <Calendar size={48} />
                  <span>Agenda tu clase de prueba</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Testimonials ===== */}
      <section className="section" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <Star size={14} /> Testimonios
          </div>
          <h2 className="section-title">Lo que dicen nuestros alumnos</h2>
          <p className="section-subtitle">
            Más de 500 familias confían en nosotros para su formación musical.
          </p>
          <div className="grid-3">
            {TESTIMONIALS.map((testimonial, idx) => (
              <div key={idx} className="card testimonial-card">
                <div className="testimonial-card__stars">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} size={16} fill="var(--color-primary)" color="var(--color-primary)" />
                  ))}
                </div>
                <p className="testimonial-card__text">"{testimonial.text}"</p>
                <div className="testimonial-card__author">
                  <div className="testimonial-card__avatar">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <strong>{testimonial.name}</strong>
                    <span>{testimonial.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="cta-section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'white', marginBottom: '1rem' }}>
            ¿Listo para empezar tu viaje musical?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', maxWidth: '500px', margin: '0 auto 2rem', fontSize: '1.1rem' }}>
            Agenda una clase de prueba gratuita y descubre el instrumento perfecto para ti.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-primary btn-lg" onClick={() => navigate('/precios')}>
              Empieza Hoy
              <ArrowRight size={20} />
            </button>
            <button
              className="btn-lg"
              onClick={() => navigate('/ubicacion')}
              style={{
                backgroundColor: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.8rem 1.75rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.25s ease',
              }}
            >
              <MapPin size={18} />
              Visítanos
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
