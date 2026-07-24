import { BookOpen, Heart, Award, Users, Music, Target } from 'lucide-react';
import './History.css';

const TIMELINE = [
  {
    year: '2014',
    title: 'Nuestros Inicios',
    description: 'Música Más Vida nació como un pequeño estudio de música en un garaje con solo 3 instrumentos y la visión de democratizar la educación musical.',
  },
  {
    year: '2016',
    title: 'Primer Local Propio',
    description: 'Abrimos nuestro primer espacio dedicado con 3 salas de clase y capacidad para 50 alumnos. Incorporamos 5 maestros al equipo.',
  },
  {
    year: '2018',
    title: 'Expansión y Reconocimiento',
    description: 'Fuimos reconocidos como la mejor escuela de música emergente de la región. Ampliamos a 8 salas y un auditorio para recitales.',
  },
  {
    year: '2020',
    title: 'Adaptación Digital',
    description: 'Lanzamos clases en línea durante la pandemia, llegando a alumnos en todo el país. Desarrollamos nuestra plataforma digital propia.',
  },
  {
    year: '2022',
    title: 'Centro de Producción',
    description: 'Inauguramos nuestro estudio de grabación y producción musical, ofreciendo un programa completo de producción digital.',
  },
  {
    year: '2024',
    title: 'Innovación Tecnológica',
    description: 'Integramos tecnología wearable y Smart TV para una experiencia educativa inmersiva. Lanzamos la app para smartwatch.',
  },
  {
    year: '2026',
    title: 'Presente y Futuro',
    description: 'Más de 500 alumnos activos, 15 maestros y un programa educativo reconocido. Seguimos innovando día a día.',
  },
];

const VALUES = [
  {
    icon: <Heart size={28} />,
    title: 'Pasión',
    description: 'La música es nuestra pasión y la compartimos con cada alumno.',
  },
  {
    icon: <Award size={28} />,
    title: 'Excelencia',
    description: 'Buscamos la excelencia en cada clase, cada nota y cada experiencia.',
  },
  {
    icon: <Users size={28} />,
    title: 'Comunidad',
    description: 'Creemos en el poder de la comunidad para inspirar y motivar.',
  },
  {
    icon: <Target size={28} />,
    title: 'Innovación',
    description: 'Incorporamos tecnología y métodos modernos de enseñanza.',
  },
];

export function History() {
  return (
    <div className="history-page">
      <section className="page-header">
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <BookOpen size={14} /> Nuestra Historia
          </div>
          <h1 className="section-title">Más que una escuela,<br />una familia musical</h1>
          <p className="section-subtitle">
            Conoce el camino que hemos recorrido desde nuestros humildes inicios hasta convertirnos en la escuela líder de la región.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="section" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
        <div className="container-narrow" style={{ textAlign: 'center' }}>
          <Music size={40} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Nuestra Misión</h2>
          <p style={{ fontSize: '1.15rem', lineHeight: 1.8 }}>
            Transformar vidas a través de la educación musical de calidad, creando un espacio donde cada persona pueda descubrir, desarrollar y disfrutar su talento musical, sin importar su edad, nivel o experiencia previa.
          </p>
        </div>
      </section>

      {/* Timeline */}
      <section className="section">
        <div className="container">
          <h2 className="section-title">Nuestra Trayectoria</h2>
          <p className="section-subtitle">Un camino de pasión y crecimiento constante.</p>
          <div className="timeline">
            {TIMELINE.map((item, idx) => (
              <div key={idx} className={`timeline__item ${idx % 2 === 0 ? 'timeline__item--left' : 'timeline__item--right'}`}>
                <div className="timeline__dot" />
                <div className="card-static timeline__card">
                  <span className="timeline__year">{item.year}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
        <div className="container">
          <h2 className="section-title">Nuestros Valores</h2>
          <p className="section-subtitle">Los principios que guían todo lo que hacemos.</p>
          <div className="grid-4">
            {VALUES.map((value, idx) => (
              <div key={idx} className="card value-card" style={{ textAlign: 'center' }}>
                <div className="value-card__icon">{value.icon}</div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
