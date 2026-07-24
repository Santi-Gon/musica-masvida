import { useState, useEffect, type FormEvent } from 'react';
import { PageHeader } from '../../components/layout/AdminLayout';
import { teachersApi, type Teacher } from '../../services/api';

const EMPTY: Omit<Teacher, 'id' | 'createdAt'> = {
  name: '', bio: '', photoUrl: '', instruments: [], email: '', phone: '', isActive: true,
};

export default function Teachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<Teacher | null>(null);
  const [form, setForm]         = useState({ ...EMPTY });
  const [instrumentsStr, setInstrumentsStr] = useState(''); // comma-separated input
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');

  const load = () => {
    setLoading(true);
    teachersApi.getAll().then(setTeachers).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...EMPTY }); setInstrumentsStr(''); setError(''); setModal('create');
  };
  const openEdit = (t: Teacher) => {
    setSelected(t);
    setForm({ name: t.name, bio: t.bio, photoUrl: t.photoUrl || '', instruments: t.instruments, email: t.email || '', phone: t.phone || '', isActive: t.isActive });
    setInstrumentsStr(t.instruments.join(', '));
    setError(''); setModal('edit');
  };
  const openDelete = (t: Teacher) => { setSelected(t); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = { ...form, instruments: instrumentsStr.split(',').map(s => s.trim()).filter(Boolean) };
    try {
      if (modal === 'create') await teachersApi.create(payload);
      else if (modal === 'edit' && selected) await teachersApi.update(selected.id, payload);
      load(); closeModal();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try { await teachersApi.remove(selected.id); load(); closeModal(); }
    catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.instruments.some(i => i.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <PageHeader title="Maestros" subtitle="Gestiona el equipo docente" />
      <div className="page-content">
        <div className="table-wrapper">
          <div className="table-header">
            <h2>👨‍🏫 Lista de maestros <span className="badge badge-gold" style={{ marginLeft:'0.5rem' }}>{teachers.length}</span></h2>
            <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input id="search-teachers" placeholder="Buscar maestros..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button id="btn-create-teacher" className="btn btn-primary" onClick={openCreate}>
                ＋ Nuevo maestro
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👨‍🏫</div>
              <h3>No hay maestros</h3>
              <p>Agrega el primer maestro al equipo</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Maestro</th><th>Instrumentos</th><th>Contacto</th><th>Estado</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                        <div className="sidebar-avatar" style={{ width:36, height:36, fontSize:'0.9rem', flexShrink:0 }}>
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600 }}>{t.name}</div>
                          <div className="td-secondary">{t.bio.substring(0,50)}…</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:'0.35rem', flexWrap:'wrap' }}>
                        {t.instruments.map(i => (
                          <span key={i} className="badge badge-purple">{i}</span>
                        ))}
                      </div>
                    </td>
                    <td className="td-secondary">{t.email || '—'}</td>
                    <td>
                      <span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {t.isActive ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => openEdit(t)}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Eliminar" onClick={() => openDelete(t)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nuevo maestro' : '✏️ Editar maestro'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:'1rem' }}>⚠️ {error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="t-name">Nombre *</label>
                    <input id="t-name" required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Juan García" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="t-email">Correo</label>
                    <input id="t-email" type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="juan@ejemplo.com" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="t-bio">Biografía *</label>
                  <textarea id="t-bio" required value={form.bio} onChange={e => setForm({...form, bio:e.target.value})} placeholder="Descripción del maestro..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="t-instruments">Instrumentos *</label>
                    <input id="t-instruments" required value={instrumentsStr} onChange={e => setInstrumentsStr(e.target.value)} placeholder="Guitarra, Piano, Violín" />
                    <span className="form-hint">Separados por coma</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor="t-phone">Teléfono</label>
                    <input id="t-phone" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="+52 33 0000 0000" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="t-photo">URL de foto</label>
                  <input id="t-photo" type="url" value={form.photoUrl} onChange={e => setForm({...form, photoUrl:e.target.value})} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive:e.target.checked})} style={{ width:'auto' }} />
                    Maestro activo (visible en el sitio)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button id="btn-save-teacher" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {modal === 'delete' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div className="confirm-icon">🗑️</div>
              <h3>¿Eliminar maestro?</h3>
              <p>¿Estás seguro de eliminar a <strong>"{selected.name}"</strong>?</p>
            </div>
            {error && <div className="login-error" style={{ margin:'0 1.5rem 1rem' }}>⚠️ {error}</div>}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? '⏳...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
