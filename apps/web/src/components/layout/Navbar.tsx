import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Music, Menu, X } from 'lucide-react';
import './Navbar.css';

const NAV_LINKS = [
  { path: '/', label: 'Inicio' },
  { path: '/instrumentos', label: 'Instrumentos' },
  { path: '/maestros', label: 'Maestros' },
  { path: '/precios', label: 'Precios' },
  { path: '/eventos', label: 'Eventos' },
  { path: '/ubicacion', label: 'Ubicación' },
  { path: '/historia', label: 'Nuestra Historia' },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;
  const isLoggedIn = !!localStorage.getItem('accessToken');

  return (
    <>
      <header className={`navbar ${isScrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__inner container">
          {/* Logo */}
          <Link to="/" className="navbar__logo">
            <div className="navbar__logo-icon">
              <Music size={24} />
            </div>
            <span className="navbar__logo-text">Música Más Vida</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="navbar__nav">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`navbar__link ${isActive(link.path) ? 'navbar__link--active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="navbar__actions">
            {isLoggedIn ? (
              <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                Dashboard
              </button>
            ) : (
              <>
                <button className="btn-ghost" onClick={() => navigate('/login')}>
                  Iniciar Sesión
                </button>
                <button className="btn-primary" onClick={() => navigate('/precios')}>
                  Inscríbete
                </button>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="navbar__toggle"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileOpen && (
        <div className="mobile-menu overlay" onClick={() => setIsMobileOpen(false)}>
          <nav className="mobile-menu__content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu__header">
              <div className="navbar__logo">
                <div className="navbar__logo-icon">
                  <Music size={24} />
                </div>
                <span className="navbar__logo-text">Música Más Vida</span>
              </div>
              <button className="navbar__toggle" onClick={() => setIsMobileOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="mobile-menu__links">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`mobile-menu__link ${isActive(link.path) ? 'mobile-menu__link--active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mobile-menu__actions">
              {isLoggedIn ? (
                <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/dashboard')}>
                  Dashboard
                </button>
              ) : (
                <>
                  <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
                    Iniciar Sesión
                  </button>
                  <button className="btn-primary" style={{ width: '100%' }} onClick={() => navigate('/precios')}>
                    Inscríbete Hoy
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Spacer for fixed navbar */}
      <div style={{ height: 'var(--navbar-height)' }} />
    </>
  );
}
