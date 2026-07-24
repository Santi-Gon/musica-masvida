import { useState, useEffect } from 'react';
import { X, Music, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PopupModal.css';

interface PopupModalProps {
  /** Delay in ms before showing the popup (default: 5000) */
  delay?: number;
}

export function PopupModal({ delay = 5000 }: PopupModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Don't show if already dismissed this session
    const dismissed = sessionStorage.getItem('popup-dismissed');
    if (dismissed) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const handleClose = () => {
    setIsVisible(false);
    sessionStorage.setItem('popup-dismissed', 'true');
  };

  const handleCTA = () => {
    handleClose();
    navigate('/precios');
  };

  if (!isVisible) return null;

  return (
    <div className="overlay" onClick={handleClose}>
      <div className="popup animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <button className="popup__close" onClick={handleClose} aria-label="Cerrar">
          <X size={20} />
        </button>

        <div className="popup__icon">
          <Music size={36} />
        </div>

        <h3 className="popup__title">¡Empieza tu viaje musical!</h3>
        <p className="popup__text">
          Inscríbete hoy y obtén tu primera clase <strong>completamente gratis</strong>. 
          Descubre el instrumento perfecto para ti.
        </p>

        <div className="popup__actions">
          <button className="btn-primary" onClick={handleCTA}>
            Ver Planes
            <ArrowRight size={18} />
          </button>
          <button className="btn-ghost" onClick={handleClose}>
            Quizás después
          </button>
        </div>

        <p className="popup__footnote">
          Sin compromisos. Cancela cuando quieras.
        </p>
      </div>
    </div>
  );
}
