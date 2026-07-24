import { Users, Award, Music, Mail } from 'lucide-react';
import './Teachers.css';

const TEACHERS = [
  {
    name: 'Roberto Hernández',
    specialty: 'Piano Clásico y Jazz',
    bio: 'Graduado del Conservatorio Nacional con más de 15 años de experiencia como concertista y pedagogo. Especialista en técnica clásica y armonía jazz.',
    instruments: ['Piano', 'Teclado'],
    experience: '15 años',
  },
  {
    name: 'Laura Martínez',
    specialty: 'Guitarra y Composición',
    bio: 'Guitarrista profesional con experiencia en giras internacionales. Enseña guitarra acústica, eléctrica y composición de canciones.',
    instruments: ['Guitarra Acústica', 'Guitarra Eléctrica'],
    experience: '12 años',
  },
  {
    name: 'Diego Torres',
    specialty: 'Batería y Percusión',
    bio: 'Baterista de sesión con colaboraciones en más de 50 álbumes. Experto en rock, jazz, latin y música fusión.',
    instruments: ['Batería', 'Percusión'],
    experience: '10 años',
  },
  {
    name: 'Sofía Ramírez',
    specialty: 'Canto y Técnica Vocal',
    bio: 'Soprano lírica con formación en el Berklee College of Music. Especialista en técnica vocal, interpretación y preparación escénica.',
    instruments: ['Canto', 'Solfeo'],
    experience: '8 años',
  },
  {
    name: 'Miguel Ángel Ruiz',
    specialty: 'Violín y Música de Cámara',
    bio: 'Primer violín en la Orquesta Sinfónica Estatal durante 7 años. Imparte clases de violín clásico y ensamble.',
    instruments: ['Violín', 'Viola'],
    experience: '14 años',
  },
  {
    name: 'Alejandra Vega',
    specialty: 'Producción Musical',
    bio: 'Productora musical certificada por Ableton. Especialista en producción electrónica, mezcla y masterización digital.',
    instruments: ['Producción', 'Síntesis'],
    experience: '6 años',
  },
];

export function Teachers() {
  return (
    <div className="teachers-page">
      <section className="page-header">
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <Users size={14} /> Nuestro Equipo
          </div>
          <h1 className="section-title">Maestros Expertos</h1>
          <p className="section-subtitle">
            Profesionales activos en la industria musical, apasionados por compartir su conocimiento.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="grid-3">
            {TEACHERS.map((teacher, idx) => (
              <div key={idx} className="card teacher-card">
                <div className="teacher-card__avatar">
                  {teacher.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <h3 className="teacher-card__name">{teacher.name}</h3>
                <p className="teacher-card__specialty">{teacher.specialty}</p>
                <p className="teacher-card__bio">{teacher.bio}</p>
                <div className="teacher-card__meta">
                  <div className="teacher-card__meta-item">
                    <Award size={14} />
                    <span>{teacher.experience}</span>
                  </div>
                  <div className="teacher-card__meta-item">
                    <Music size={14} />
                    <span>{teacher.instruments.join(', ')}</span>
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
