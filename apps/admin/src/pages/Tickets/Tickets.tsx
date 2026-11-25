import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/layout/AdminLayout';
import {
  ticketsApi,
  type SupportTicket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../../services/api';

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROCESO', label: 'En proceso' },
  { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'TERMINADO', label: 'Terminado' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: 'BAJA', label: 'Baja' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'CRITICA', label: 'Crítica' },
];

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  APP_ERROR: 'Error de la aplicación',
  LOGIN_ISSUE: 'Problema de inicio de sesión',
  EVENT_REGISTRATION: 'Inscripción a evento',
  OTRO: 'Otro',
};

const PRIORITY_PRESENTATION: Record<TicketPriority, { label: string; className: string }> = {
  BAJA: { label: 'Baja', className: 'badge-success' },
  MEDIA: { label: 'Media', className: 'badge-purple' },
  ALTA: { label: 'Alta', className: 'badge-gold' },
  CRITICA: { label: 'Crítica', className: 'badge-danger' },
};

export default function Tickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');
  const [error, setError] = useState('');
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [savingPriorityId, setSavingPriorityId] = useState<string | null>(null);
  const [selected, setSelected] = useState<SupportTicket | null>(null);

  useEffect(() => {
    let active = true;
    ticketsApi.getAll()
      .then(data => { if (active) setTickets(data); })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Error al cargar tickets');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-MX');
    return tickets.filter(ticket => {
      if (statusFilter && ticket.status !== statusFilter) return false;
      if (!query) return true;
      return [
        ticket.user.name,
        ticket.user.email,
        ticket.title,
        ticket.description,
        CATEGORY_LABELS[ticket.category],
        ticket.category,
      ].some(value => value.toLocaleLowerCase('es-MX').includes(query));
    });
  }, [tickets, search, statusFilter]);

  const updateStatus = async (ticket: SupportTicket, status: TicketStatus) => {
    if (ticket.status === status) return;
    setError('');
    setSavingStatusId(ticket.id);
    try {
      const updated = await ticketsApi.updateStatus(ticket.id, status);
      setTickets(current => current.map(item => item.id === ticket.id ? updated : item));
      setSelected(current => current?.id === ticket.id ? updated : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del ticket');
    } finally {
      setSavingStatusId(current => current === ticket.id ? null : current);
    }
  };

  const updatePriority = async (ticket: SupportTicket, priority: TicketPriority) => {
    if (ticket.priority === priority) return;
    setError('');
    setSavingPriorityId(ticket.id);
    try {
      const updated = await ticketsApi.updatePriority(ticket.id, priority);
      setTickets(current => current.map(item => item.id === ticket.id ? updated : item));
      setSelected(current => current?.id === ticket.id ? updated : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la prioridad del ticket');
    } finally {
      setSavingPriorityId(current => current === ticket.id ? null : current);
    }
  };

  return (
    <>
      <PageHeader title="Tickets de soporte" subtitle="Reportes de incidentes enviados por los alumnos" />
      <div className="page-content">
        {error && <div className="login-error">⚠️ {error}</div>}
        <div className="table-wrapper">
          <div className="table-header">
            <h2>🎫 Reportes <span className="badge badge-purple" style={{ marginLeft: '0.5rem' }}>{tickets.length}</span></h2>
            <div className="ticket-toolbar">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  id="search-tickets"
                  placeholder="Buscar tickets..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>
              <select
                aria-label="Filtrar por estado"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as TicketStatus | '')}
                style={{ width: 'auto', minWidth: 150 }}
              >
                <option value="">Todos los estados</option>
                {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-center"><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎫</div>
              <h3>{tickets.length === 0 ? 'No hay tickets' : 'No hay resultados'}</h3>
              <p>{tickets.length === 0 ? 'Los reportes de soporte aparecerán aquí.' : 'Ajusta la búsqueda o el filtro de estado.'}</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Alumno</th><th>Asunto / descripción</th><th>Categoría</th><th>Prioridad</th><th>Estado</th><th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(ticket => {
                  const priority = PRIORITY_PRESENTATION[ticket.priority];
                  return (
                    <tr key={ticket.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{ticket.user.name}</div>
                        <div className="td-secondary">{ticket.user.email}</div>
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: 0, textAlign: 'left', display: 'block' }}
                          onClick={() => setSelected(ticket)}
                          title="Ver reporte completo"
                        >
                          <div style={{ fontWeight: 600 }}>{ticket.title}</div>
                          <div className="td-secondary">{ticket.description.length > 90 ? `${ticket.description.slice(0, 90)}…` : ticket.description}</div>
                        </button>
                      </td>
                      <td className="td-secondary">{CATEGORY_LABELS[ticket.category]}</td>
                      <td>
                        <span className={`badge ${priority.className}`}>{priority.label}</span>
                        <select
                          aria-label={`Prioridad de ticket de ${ticket.user.name}`}
                          value={ticket.priority}
                          disabled={savingPriorityId === ticket.id || savingStatusId === ticket.id}
                          aria-busy={savingPriorityId === ticket.id}
                          onChange={event => void updatePriority(ticket, event.target.value as TicketPriority)}
                          style={{ minWidth: 120, marginTop: '0.4rem' }}
                        >
                          {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        {savingPriorityId === ticket.id && <div className="td-secondary">Guardando prioridad...</div>}
                      </td>
                      <td>
                        <select
                          aria-label={`Estado de ticket de ${ticket.user.name}`}
                          value={ticket.status}
                          disabled={savingStatusId === ticket.id || savingPriorityId === ticket.id}
                          aria-busy={savingStatusId === ticket.id}
                          onChange={event => void updateStatus(ticket, event.target.value as TicketStatus)}
                          style={{ minWidth: 135 }}
                        >
                          {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        {savingStatusId === ticket.id && <div className="td-secondary">Guardando estado...</div>}
                      </td>
                      <td className="td-secondary">{new Date(ticket.createdAt).toLocaleString('es-MX')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <div className="modal-header">
              <h2>🎫 Reporte de soporte</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelected(null)} aria-label="Cerrar">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label>Alumno</label><div>{selected.user.name} <span className="td-secondary">({selected.user.email})</span></div></div>
              <div className="form-group"><label>Asunto</label><div>{selected.title}</div></div>
              <div className="form-group"><label>Descripción</label><p style={{ whiteSpace: 'pre-wrap' }}>{selected.description}</p></div>
              <div className="form-row">
                <div className="form-group"><label>Categoría</label><div>{CATEGORY_LABELS[selected.category]}</div></div>
                <div className="form-group">
                  <label htmlFor="ticket-modal-priority">Prioridad</label>
                  <span className={`badge ${PRIORITY_PRESENTATION[selected.priority].className}`}>
                    {PRIORITY_PRESENTATION[selected.priority].label}
                  </span>
                  <select
                    id="ticket-modal-priority"
                    value={selected.priority}
                    disabled={savingPriorityId === selected.id || savingStatusId === selected.id}
                    aria-busy={savingPriorityId === selected.id}
                    onChange={event => void updatePriority(selected, event.target.value as TicketPriority)}
                    style={{ marginTop: '0.5rem' }}
                  >
                    {PRIORITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  {savingPriorityId === selected.id && <div className="form-hint">Guardando prioridad...</div>}
                </div>
              </div>
              {selected.deviceInfo && <div className="form-group"><label>Información del dispositivo</label><div>{selected.deviceInfo}</div></div>}
              <div className="form-group"><label>Creado</label><div>{new Date(selected.createdAt).toLocaleString('es-MX')}</div></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
