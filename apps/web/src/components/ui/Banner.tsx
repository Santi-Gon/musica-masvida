import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import './Banner.css';

interface BannerProps {
  message?: string;
  ctaText?: string;
  ctaLink?: string;
}

export function Banner({ 
  message = '🎵 ¡Inscripciones abiertas! Obtén 20% de descuento en tu primer mes.',
  ctaText = 'Ver Oferta',
  ctaLink = '/precios'
}: BannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="banner">
      <div className="banner__content container">
        <div className="banner__message">
          <Sparkles size={16} />
          <span>{message}</span>
          {ctaText && (
            <a href={ctaLink} className="banner__cta">
              {ctaText} →
            </a>
          )}
        </div>
        <button
          className="banner__close"
          onClick={() => setIsVisible(false)}
          aria-label="Cerrar banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
