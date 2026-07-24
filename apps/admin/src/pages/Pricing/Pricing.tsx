import { useState, useEffect, type FormEvent } from 'react';
import { PageHeader } from '../../components/layout/AdminLayout';
import { pricingApi, type PricingPlan } from '../../services/api';

const FREQUENCIES = ['MONTHLY','WEEKLY','QUARTERLY','YEARLY','ONE_TIME'];
const FREQ_LABELS: Record<string, string> = {
  MONTHLY:'Mensual', WEEKLY:'Semanal', QUARTERLY:'Trimestral', YEARLY:'Anual', ONE_TIME:'Pago único'
};

const EMPTY: Omit<PricingPlan, 'id' | 'createdAt'> = {
  name: '', description: '', price: 0, currency: 'MXN',
  frequency: 'MONTHLY', features: [], isPopular: false, isActive: true,
};

export default function Pricing() {
  const [plans, setPlans]   = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<'create' | 'edit' | 'delete' | null>(null);
  const [selected, setSelected] = useState<PricingPlan | null>(null);
  const [form, setForm]     = useState({ ...EMPTY });
  const [featuresStr, setFeaturesStr] = useState(''); // newline-separated
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const load = () => {
    setLoading(true);
    pricingApi.getAll().then(setPlans).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm({ ...EMPTY }); setFeaturesStr(''); setError(''); setModal('create'); };
  const openEdit   = (p: PricingPlan) => {
    setSelected(p);
    setForm({ name:p.name, description:p.description, price:p.price, currency:p.currency, frequency:p.frequency, features:p.features, isPopular:p.isPopular, isActive:p.isActive });
    setFeaturesStr(p.features.join('\n'));
    setError(''); setModal('edit');
  };
  const openDelete = (p: PricingPlan) => { setSelected(p); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true); setError('');
    const payload = { ...form, features: featuresStr.split('\n').map(s => s.trim()).filter(Boolean), price: Number(form.price) };
    try {
      if (modal === 'create') await pricingApi.create(payload);
      else if (modal === 'edit' && selected) await pricingApi.update(selected.id, payload);
      load(); closeModal();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try { await pricingApi.remove(selected.id); load(); closeModal(); }
    catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader title="Planes de Precios" subtitle="Gestiona la oferta de precios" />
      <div className="page-content">

        {/* Cards view */}
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
              <h2 style={{ fontSize:'1rem' }}>
                💰 Planes activos <span className="badge badge-gold" style={{ marginLeft:'0.5rem' }}>{plans.length}</span>
              </h2>
              <button id="btn-create-plan" className="btn btn-primary" onClick={openCreate}>＋ Nuevo plan</button>
            </div>

            {plans.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">💰</div>
                <h3>No hay planes de precios</h3>
                <p>Crea el primer plan para comenzar</p>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'1rem' }}>
                {plans.map(p => (
                  <div key={p.id} className="card" style={{ position:'relative', border: p.isPopular ? '1px solid var(--accent)' : undefined }}>
                    {p.isPopular && (
                      <span className="badge badge-purple" style={{ position:'absolute', top:'1rem', right:'1rem' }}>⭐ Popular</span>
                    )}
                    <div style={{ marginBottom:'0.5rem' }}>
                      <h3>{p.name}</h3>
                      <p style={{ fontSize:'0.8rem', marginTop:'0.25rem' }}>{p.description}</p>
                    </div>
                    <div style={{ fontSize:'2rem', fontWeight:800, color:'var(--accent-light)', margin:'1rem 0' }}>
                      ${p.price.toLocaleString()} <span style={{ fontSize:'0.9rem', fontWeight:400, color:'var(--text-muted)' }}>{p.currency} / {FREQ_LABELS[p.frequency]}</span>
                    </div>
                    <ul style={{ listStyle:'none', marginBottom:'1rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                      {p.features.map(f => (
                        <li key={f} style={{ fontSize:'0.8rem', color:'var(--text-secondary)', display:'flex', gap:'0.5rem' }}>
                          <span style={{ color:'var(--success)' }}>✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <div style={{ display:'flex', gap:'0.5rem', alignItems:'center' }}>
                      <span className={`badge ${p.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                      <div style={{ marginLeft:'auto', display:'flex', gap:'0.5rem' }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(p)}>✏️</button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => openDelete(p)}>🗑️</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modal === 'create' ? '➕ Nuevo plan' : '✏️ Editar plan'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="login-error" style={{ marginBottom:'1rem' }}>⚠️ {error}</div>}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="p-name">Nombre del plan *</label>
                    <input id="p-name" required value={form.name} onChange={e => setForm({...form, name:e.target.value})} placeholder="Plan Básico" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-frequency">Frecuencia *</label>
                    <select id="p-frequency" value={form.frequency} onChange={e => setForm({...form, frequency:e.target.value})}>
                      {FREQUENCIES.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="p-desc">Descripción *</label>
                  <textarea id="p-desc" required value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Ideal para principiantes..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="p-price">Precio *</label>
                    <input id="p-price" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({...form, price:Number(e.target.value)})} placeholder="500" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="p-currency">Moneda</label>
                    <input id="p-currency" value={form.currency} onChange={e => setForm({...form, currency:e.target.value})} placeholder="MXN" />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="p-features">Beneficios (uno por línea) *</label>
                  <textarea id="p-features" required value={featuresStr} onChange={e => setFeaturesStr(e.target.value)} placeholder={"2 clases por semana\nMaterial incluido\nCertificado"} style={{ minHeight:110 }} />
                </div>
                <div style={{ display:'flex', gap:'1.5rem' }}>
                  <div className="form-group">
                    <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer' }}>
                      <input type="checkbox" checked={form.isPopular} onChange={e => setForm({...form, isPopular:e.target.checked})} style={{ width:'auto' }} />
                      ⭐ Marcar como popular
                    </label>
                  </div>
                  <div className="form-group">
                    <label style={{ display:'flex', alignItems:'center', gap:'0.5rem', cursor:'pointer' }}>
                      <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive:e.target.checked})} style={{ width:'auto' }} />
                      Activo (visible)
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button id="btn-save-plan" type="submit" className="btn btn-primary" disabled={saving}>
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
              <h3>¿Eliminar plan?</h3>
              <p>¿Estás seguro de eliminar el plan <strong>"{selected.name}"</strong>?</p>
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
