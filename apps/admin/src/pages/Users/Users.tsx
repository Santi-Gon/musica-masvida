import { useState, useEffect, type FormEvent } from 'react';
import { PageHeader } from '../../components/layout/AdminLayout';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface AppUser {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { medicalReminders: number; physicalActivities: number };
}

interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  createdAt: string;
}

// ── Servicio mínimo (usa el mismo patrón que api.ts) ─────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE = `${API_URL}/api/v1`;

function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...authHeaders(), ...(opts?.headers || {}) } });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error en la petición');
  return data as T;
}

const usersApi = {
  getAll:    ()                       => req<AppUser[]>('/users/admin/all'),
  update:    (id: string, body: Partial<AppUser>) =>
                                         req<AppUser>(`/users/admin/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  getAudit:  (id: string)             => req<AuditEntry[]>(`/users/admin/${id}/audit`),
};

// ── Etiqueta de acción de auditoría ──────────────────────────────────────────

function actionBadge(action: string) {
  if (action === 'BAJA_LOGICA')   return <span className="badge badge-danger">🔒 Baja lógica</span>;
  if (action === 'REACTIVACION')  return <span className="badge badge-success">✅ Reactivación</span>;
  return <span className="badge badge-purple">✏️ Edición</span>;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Users() {
  const [users,    setUsers]    = useState<AppUser[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [modal,    setModal]    = useState<'edit' | 'audit' | null>(null);
  const [selected, setSelected] = useState<AppUser | null>(null);
  const [form,     setForm]     = useState({ name: '', email: '' });
  const [audit,    setAudit]    = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const load = () => {
    setLoading(true);
    usersApi.getAll().then(setUsers).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // ── Abrir modales ──

  const openEdit = (u: AppUser) => {
    setSelected(u);
    setForm({ name: u.name, email: u.email });
    setError('');
    setModal('edit');
  };

  const openAudit = async (u: AppUser) => {
    setSelected(u);
    setModal('audit');
    setAuditLoading(true);
    try { setAudit(await usersApi.getAudit(u.id)); }
    catch { setAudit([]); }
    finally { setAuditLoading(false); }
  };

  const closeModal = () => { setModal(null); setSelected(null); };

  // ── Guardar edición ──

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true); setError('');
    try {
      await usersApi.update(selected.id, form);
      load(); closeModal();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  // ── Toggle baja/reactivación ──

  const handleToggleActive = async (u: AppUser) => {
    setSaving(true);
    try {
      await usersApi.update(u.id, { isActive: !u.isActive });
      load();
    } catch (err: any) { alert(err.message); }
    finally { setSaving(false); }
  };

  // ── Filtrado ──

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader title="Usuarios" subtitle="Gestión y auditoría de cuentas de alumnos" />
      <div className="page-content">
        <div className="table-wrapper">
          <div className="table-header">
            <h2>👤 Usuarios registrados <span className="badge badge-purple" style={{ marginLeft: '0.5rem' }}>{users.length}</span></h2>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  id="search-users"
                  placeholder="Buscar por nombre o email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <h3>No hay usuarios</h3>
              <p>Aún no se ha registrado ningún alumno en el sistema.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Actividad</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="sidebar-avatar" style={{ width: 36, height: 36, fontSize: '0.9rem' }}>
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name}</div>
                          <div className="td-secondary">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {u.isActive ? '✓ Activo' : '✗ Inactivo'}
                      </span>
                    </td>
                    <td className="td-secondary">
                      💊 {u._count.medicalReminders} rem. &nbsp;|&nbsp; 🏃 {u._count.physicalActivities} act.
                    </td>
                    <td className="td-secondary">
                      {new Date(u.createdAt).toLocaleDateString('es-MX')}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Editar datos"
                          onClick={() => openEdit(u)}
                        >✏️</button>
                        <button
                          id={`btn-toggle-user-${u.id}`}
                          className={`btn btn-sm btn-icon ${u.isActive ? 'btn-danger' : 'btn-ghost'}`}
                          title={u.isActive ? 'Dar de baja' : 'Reactivar'}
                          disabled={saving}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.isActive ? '🔒' : '🔓'}
                        </button>
                        <button
                          id={`btn-audit-user-${u.id}`}
                          className="btn btn-ghost btn-sm btn-icon"
                          title="Ver auditoría"
                          onClick={() => openAudit(u)}
                        >📋</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Modal: Editar usuario ── */}
      {modal === 'edit' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✏️ Editar usuario</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom: '1rem' }}>⚠️ {error}</div>}
                <div className="form-group">
                  <label htmlFor="user-name">Nombre completo *</label>
                  <input
                    id="user-name"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Nombre del usuario"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="user-email">Correo electrónico *</label>
                  <input
                    id="user-email"
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button id="btn-save-user" type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Auditoría ── */}
      {modal === 'audit' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📋 Auditoría — {selected.name}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {auditLoading ? (
                <div className="loading-center"><div className="spinner" /></div>
              ) : audit.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>
                  No hay registros de auditoría para este usuario.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {audit.map(entry => (
                    <div key={entry.id} style={{
                      padding: '0.875rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-bg-surface)',
                      border: '1px solid var(--color-border)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        {actionBadge(entry.action)}
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {new Date(entry.createdAt).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', margin: 0 }}>{entry.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
