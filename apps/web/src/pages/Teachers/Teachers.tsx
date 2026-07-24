import { useState, useEffect } from 'react';
import { Users, Award, Music } from 'lucide-react';
import { teachersApi, type Teacher } from '../../services/api';
import './Teachers.css';


export function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teachersApi.getPublicTeachers()
      .then(data => setTeachers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Cargando maestros...</p>
            </div>
          ) : teachers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <Users size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
              <h3>Pronto conocerás a nuestro equipo</h3>
              <p style={{ color: 'var(--text-muted)' }}>Estamos actualizando los perfiles de nuestros maestros.</p>
            </div>
          ) : (
            <div className="grid-3">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="card teacher-card">
                  <div className="teacher-card__avatar">
                    {teacher.photoUrl ? (
                      <img src={teacher.photoUrl} alt={teacher.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                      teacher.name.split(' ').map(n => n[0]).slice(0, 2).join('')
                    )}
                  </div>
                  <h3 className="teacher-card__name">{teacher.name}</h3>
                  <p className="teacher-card__specialty">{teacher.instruments.join(', ')}</p>
                  <p className="teacher-card__bio">{teacher.bio}</p>
                  <div className="teacher-card__meta">
                    <div className="teacher-card__meta-item">
                      <Award size={14} />
                      <span>Profesional</span>
                    </div>
                    <div className="teacher-card__meta-item">
                      <Music size={14} />
                      <span>{teacher.instruments.length} Inst.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
