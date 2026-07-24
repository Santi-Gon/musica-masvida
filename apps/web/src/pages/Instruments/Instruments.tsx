import { Piano, Guitar, Drum, Mic, Music, Waves, Headphones, Radio } from 'lucide-react';
import './Instruments.css';

const INSTRUMENTS = [
  {
    icon: <Piano size={32} />,
    name: 'Piano',
    category: 'Teclado',
    description: 'Desde lo clásico hasta lo contemporáneo. Aprende teoría musical, lectura de partituras y técnica con nuestros pianos de cola y digitales.',
    levels: ['Principiante', 'Intermedio', 'Avanzado'],
  },
  {
    icon: <Guitar size={32} />,
    name: 'Guitarra Acústica',
    category: 'Cuerdas',
    description: 'Domina acordes, rasgueos, fingerpicking y más. Ideal para quienes quieren acompañar canciones o componer.',
    levels: ['Principiante', 'Intermedio', 'Avanzado'],
  },
  {
    icon: <Guitar size={32} />,
    name: 'Guitarra Eléctrica',
    category: 'Cuerdas',
    description: 'Rock, blues, jazz y metal. Aprende técnicas como bending, tapping, sweep picking y uso de efectos.',
    levels: ['Principiante', 'Intermedio', 'Avanzado'],
  },
  {
    icon: <Drum size={32} />,
    name: 'Batería',
    category: 'Percusión',
    description: 'Desarrolla tu ritmo y coordinación. Clases con batería acústica y electrónica, cubriendo múltiples géneros.',
    levels: ['Principiante', 'Intermedio'],
  },
  {
    icon: <Mic size={32} />,
    name: 'Canto',
    category: 'Voz',
    description: 'Técnica vocal, respiración diafragmática, interpretación y preparación para audiciones y presentaciones.',
    levels: ['Principiante', 'Intermedio', 'Avanzado'],
  },
  {
    icon: <Music size={32} />,
    name: 'Violín',
    category: 'Cuerdas',
    description: 'Instrumento elegante y expresivo. Aprende desde postura y afinación hasta interpretación de obras clásicas.',
    levels: ['Principiante', 'Intermedio'],
  },
  {
    icon: <Waves size={32} />,
    name: 'Bajo Eléctrico',
    category: 'Cuerdas',
    description: 'El corazón rítmico de cualquier banda. Aprende slap, walking bass, grooves y teoría aplicada.',
    levels: ['Principiante', 'Intermedio'],
  },
  {
    icon: <Headphones size={32} />,
    name: 'Producción Musical',
    category: 'Digital',
    description: 'Crea música digital con DAWs profesionales. Mezcla, masterización, síntesis y diseño sonoro.',
    levels: ['Principiante', 'Intermedio'],
  },
  {
    icon: <Radio size={32} />,
    name: 'Ukulele',
    category: 'Cuerdas',
    description: 'Instrumento divertido y accesible. Perfecto para principiantes de cualquier edad.',
    levels: ['Principiante'],
  },
];

export function Instruments() {
  return (
    <div className="instruments-page">
      {/* Header */}
      <section className="page-header">
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <Music size={14} /> Catálogo de Instrumentos
          </div>
          <h1 className="section-title">Nuestros Instrumentos</h1>
          <p className="section-subtitle">
            Explora nuestra amplia oferta de instrumentos y encuentra el que más se adapte a ti.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="section">
        <div className="container">
          <div className="grid-3">
            {INSTRUMENTS.map((inst, idx) => (
              <div key={idx} className="card instrument-detail-card">
                <div className="instrument-detail-card__header">
                  <div className="instrument-detail-card__icon">{inst.icon}</div>
                  <span className="badge badge-primary">{inst.category}</span>
                </div>
                <h3>{inst.name}</h3>
                <p>{inst.description}</p>
                <div className="instrument-detail-card__levels">
                  {inst.levels.map((level) => (
                    <span key={level} className="instrument-detail-card__level">{level}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
