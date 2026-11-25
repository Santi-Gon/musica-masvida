import { useState, useEffect, type FormEvent } from 'react';
import { PageHeader } from '../../components/layout/AdminLayout';
import { eventsApi, type AdminEvent, type EventRegistrations } from '../../services/api';

const EMPTY: Omit<AdminEvent, 'id' | 'createdAt' | '_count'> = {
  title: '', description: '', date: '', time: '', location: '', imageUrl: '',
  isActive: true, capacity: 50,
};

export default function Events() {
  const [events, setEvents]   = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState<'create' | 'edit' | 'delete' | 'registrations' | null>(null);
  const [selected, setSelected] = useState<AdminEvent | null>(null);
  const [registrationData, setRegistrationData] = useState<EventRegistrations | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [form, setForm]       = useState({ ...EMPTY });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [search, setSearch]   = useState('');

  const refreshEvents = async () => {
    try { setEvents(await eventsApi.getAll()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al actualizar eventos'); }
  };

  const load = () => {
    setLoading(true);
    eventsApi.getAll().then(setEvents).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(() => { void refreshEvents(); }, 5000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (modal !== 'registrations' || !selected) return;
    let active = true;
    const refreshRegistrations = async () => {
      try {
        const data = await eventsApi.getRegistrations(selected.id);
        if (active) setRegistrationData(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Error al actualizar inscritos');
      }
    };
    const interval = window.setInterval(() => { void refreshRegistrations(); }, 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [modal, selected?.id]);

  const openCreate = () => { setForm({ ...EMPTY }); setError(''); setModal('create'); };
  const openEdit   = (ev: AdminEvent) => {
    setSelected(ev);
    setForm({
      title: ev.title, description: ev.description,
      date: ev.date.split('T')[0], time: ev.time,
      location: ev.location, imageUrl: ev.imageUrl || '', isActive: ev.isActive,
      capacity: ev.capacity,
    });
    setError('');
    setModal('edit');
  };
  const openDelete = (ev: AdminEvent) => { setSelected(ev); setModal('delete'); };
  const openRegistrations = async (ev: AdminEvent) => {
    setSelected(ev);
    setRegistrationData(null);
    setRegistrationLoading(true);
    setModal('registrations');
    try { setRegistrationData(await eventsApi.getRegistrations(ev.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Error al cargar inscritos'); }
    finally { setRegistrationLoading(false); }
  };
  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setRegistrationData(null);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (modal === 'create') await eventsApi.create(form);
      else if (modal === 'edit' && selected) await eventsApi.update(selected.id, form);
      load(); closeModal();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try { await eventsApi.remove(selected.id); load(); closeModal(); }
    catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const filtered = events.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader title="Eventos" subtitle="Gestiona los eventos musicales" />
      <div className="page-content">
        {error && modal === null && <div className="login-error">{error}</div>}
        <div className="table-wrapper">
          <div className="table-header">
            <h2>🎵 Lista de eventos <span className="badge badge-purple" style={{ marginLeft:'0.5rem' }}>{events.length}</span></h2>
            <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input id="search-events" placeholder="Buscar eventos..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button id="btn-create-event" className="btn btn-primary" onClick={openCreate}>
                ＋ Nuevo evento
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎵</div>
              <h3>No hay eventos</h3>
              <p>Crea el primer evento para comenzar</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Evento</th><th>Fecha</th><th>Hora</th><th>Lugar</th><th>Inscritos</th><th>Estado</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ev => (
                  <tr key={ev.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ev.title}</div>
                      <div className="td-secondary">{ev.description.substring(0,50)}…</div>
                    </td>
                    <td className="td-secondary">{new Date(ev.date).toLocaleDateString('es-MX')}</td>
                    <td className="td-secondary">{ev.time}</td>
                    <td className="td-secondary">{ev.location}</td>
                    <td className="td-secondary">{ev._count.registrations} / {ev.capacity}</td>
                    <td>
                      <span className={`badge ${ev.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {ev.isActive ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-ghost btn-sm btn-icon" title="Ver inscritos" onClick={() => openRegistrations(ev)}>👥</button>
                        <button className="btn btn-ghost btn-sm btn-icon" title="Editar" onClick={() => openEdit(ev)}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" title="Eliminar" onClick={() => openDelete(ev)}>🗑️</button>
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
              <h2>{modal === 'create' ? '➕ Nuevo evento' : '✏️ Editar evento'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:'1rem' }}>⚠️ {error}</div>}
                <div className="form-group">
                  <label htmlFor="ev-title">Título *</label>
                  <input id="ev-title" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Concierto de Primavera" />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-desc">Descripción *</label>
                  <textarea id="ev-desc" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Descripción del evento..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ev-date">Fecha *</label>
                    <input id="ev-date" type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ev-time">Hora *</label>
                    <input id="ev-time" required value={form.time} onChange={e => setForm({...form, time: e.target.value})} placeholder="6:00 PM" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="ev-location">Lugar *</label>
                  <input id="ev-location" required value={form.location} onChange={e => setForm({...form, location: e.target.value})} placeholder="Auditorio Municipal" />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-capacity">Cupo máximo *</label>
                  <input id="ev-capacity" type="number" min="1" required value={form.capacity} onChange={e => setForm({...form, capacity: Number(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label htmlFor="ev-img">URL de imagen</label>
                  <input id="ev-img" type="url" value={form.imageUrl} onChange={e => setForm({...form, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} style={{ width:'auto' }} />
                    Evento activo (visible en el sitio)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button id="btn-save-event" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal === 'registrations' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Inscritos: {selected.title}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {registrationLoading ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : error ? (
                <div className="login-error">{error}</div>
              ) : registrationData?.registrations.length ? (
                <>
                  <p>{registrationData.total} de {registrationData.event.capacity} lugares ocupados</p>
                  <table>
                    <thead><tr><th>Alumno</th><th>Correo</th><th>Fecha de inscripción</th></tr></thead>
                    <tbody>
                      {registrationData.registrations.map(registration => (
                        <tr key={registration.id}>
                          <td>{registration.user.name}</td>
                          <td>{registration.user.email}</td>
                          <td>{new Date(registration.createdAt).toLocaleString('es-MX')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="empty-state"><p>Todavía no hay alumnos inscritos.</p></div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {modal === 'delete' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="confirm-body">
              <div className="confirm-icon">🗑️</div>
              <h3>¿Eliminar evento?</h3>
              <p>¿Estás seguro de que deseas eliminar <strong>"{selected.title}"</strong>? Esta acción no se puede deshacer.</p>
            </div>
            {error && <div className="login-error" style={{ margin:'0 1.5rem 1rem' }}>⚠️ {error}</div>}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
              <button id="btn-confirm-delete" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                {saving ? '⏳...' : '🗑️ Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
