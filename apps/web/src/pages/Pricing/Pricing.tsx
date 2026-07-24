import { Check, Star, ArrowRight, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Pricing.css';

const PLANS = [
  {
    name: 'Básico',
    price: 800,
    frequency: 'mes',
    description: 'Perfecto para principiantes que quieren explorar la música.',
    features: [
      '1 clase por semana (4 al mes)',
      'Duración de 45 minutos',
      'Material didáctico básico',
      'Acceso a sala de práctica',
      'Instrumento disponible en clase',
    ],
    isPopular: false,
  },
  {
    name: 'Intermedio',
    price: 1400,
    frequency: 'mes',
    description: 'Ideal para quienes quieren avanzar más rápido con más práctica.',
    features: [
      '2 clases por semana (8 al mes)',
      'Duración de 60 minutos',
      'Material didáctico completo',
      'Acceso libre a sala de práctica',
      'Instrumento disponible en clase',
      'Participación en recitales',
      'Grabación de una pieza al mes',
    ],
    isPopular: true,
  },
  {
    name: 'Premium',
    price: 2200,
    frequency: 'mes',
    description: 'Para músicos dedicados que buscan formación integral.',
    features: [
      '3 clases por semana (12 al mes)',
      'Duración de 60 minutos',
      'Material didáctico premium',
      'Acceso 24/7 a sala de práctica',
      'Instrumento disponible en clase',
      'Participación en recitales y eventos',
      'Grabación profesional incluida',
      'Masterclass mensuales exclusivas',
      'Certificación por nivel completado',
    ],
    isPopular: false,
  },
];

export function Pricing() {
  const navigate = useNavigate();

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
          <div className="pricing-grid">
            {PLANS.map((plan, idx) => (
              <div
                key={idx}
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
                  <span className="pricing-card__frequency">MXN / {plan.frequency}</span>
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
        </div>
      </section>
    </div>
  );
}
