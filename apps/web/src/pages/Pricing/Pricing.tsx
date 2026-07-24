import { useState, useEffect } from 'react';
import { Check, Star, ArrowRight, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { pricingApi, type PricingPlan } from '../../services/api';
import './Pricing.css';

const FREQ_LABELS: Record<string, string> = {
  MONTHLY: 'mes',
  WEEKLY: 'semana',
  QUARTERLY: 'trimestre',
  YEARLY: 'año',
  ONE_TIME: 'pago único',
};

export function Pricing() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pricingApi.getPublicPlans()
      .then(data => setPlans(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pricing-page">
      <section className="page-header">
        <div className="container">
          <div className="badge badge-primary" style={{ display: 'flex', width: 'fit-content', margin: '0 auto 1rem' }}>
            <CreditCard size={14} /> Planes y Precios
          </div>
          <h1 className="section-title">Elige tu plan perfecto</h1>
          <p className="section-subtitle">
            Planes flexibles adaptados a tu ritmo de aprendizaje. Todos incluyen clase de prueba gratuita.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Cargando planes...</p>
            </div>
          ) : plans.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <CreditCard size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
              <h3>Pronto publicaremos nuestros planes</h3>
              <p style={{ color: 'var(--text-muted)' }}>Estamos diseñando las mejores opciones para tu aprendizaje.</p>
            </div>
          ) : (
            <div className="pricing-grid">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`card-static pricing-card ${plan.isPopular ? 'pricing-card--popular' : ''}`}
                >
                  {plan.isPopular && (
                    <div className="pricing-card__badge">
                      <Star size={14} /> Más Popular
                    </div>
                  )}
                  <h3 className="pricing-card__name">{plan.name}</h3>
                  <p className="pricing-card__desc">{plan.description}</p>
                  <div className="pricing-card__price">
                    <span className="pricing-card__currency">$</span>
                    <span className="pricing-card__amount">{plan.price.toLocaleString()}</span>
                    <span className="pricing-card__frequency">{plan.currency} / {FREQ_LABELS[plan.frequency] || plan.frequency}</span>
                  </div>
                  <ul className="pricing-card__features">
                    {plan.features.map((feature, i) => (
                      <li key={i}>
                        <Check size={16} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    className={plan.isPopular ? 'btn-primary' : 'btn-secondary'}
                    style={{ width: '100%', marginTop: 'auto' }}
                    onClick={() => navigate('/login')}
                  >
                    Elegir Plan
                    <ArrowRight size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
