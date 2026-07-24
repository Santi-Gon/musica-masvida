import { Link } from 'react-router-dom';
import { Music, Mail, Phone, MapPin, Globe, Camera, Video } from 'lucide-react';
import './Footer.css';

const FOOTER_LINKS = {
  escuela: [
    { label: 'Nuestra Historia', path: '/historia' },
    { label: 'Maestros', path: '/maestros' },
    { label: 'Instrumentos', path: '/instrumentos' },
    { label: 'Eventos', path: '/eventos' },
  ],
  alumnos: [
    { label: 'Planes y Precios', path: '/precios' },
    { label: 'Iniciar Sesión', path: '/login' },
    { label: 'Ubicación', path: '/ubicacion' },
    { label: 'Dashboard', path: '/dashboard' },
  ],
  legal: [
    { label: 'Términos y Condiciones', path: '/terminos' },
    { label: 'Aviso de Privacidad', path: '/terminos#privacidad' },
  ],
};

const SOCIAL_LINKS = [
  { icon: <Globe size={20} />, href: '#', label: 'Facebook' },
  { icon: <Camera size={20} />, href: '#', label: 'Instagram' },
  { icon: <Video size={20} />, href: '#', label: 'YouTube' },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        {/* Top */}
        <div className="footer__top">
          {/* Brand */}
          <div className="footer__brand">
            <div className="footer__logo">
              <div className="navbar__logo-icon">
                <Music size={24} />
              </div>
              <span className="footer__logo-text">Música Más Vida</span>
            </div>
            <p className="footer__desc">
              Escuela de música con más de 10 años de experiencia formando músicos apasionados. Clases personalizadas para todas las edades y niveles.
            </p>
            <div className="footer__socials">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="footer__social-link"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer__links-group">
            <div className="footer__column">
              <h4 className="footer__column-title">Escuela</h4>
              {FOOTER_LINKS.escuela.map((link) => (
                <Link key={link.path} to={link.path} className="footer__link">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="footer__column">
              <h4 className="footer__column-title">Alumnos</h4>
              {FOOTER_LINKS.alumnos.map((link) => (
                <Link key={link.path} to={link.path} className="footer__link">
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="footer__column">
              <h4 className="footer__column-title">Contacto</h4>
              <div className="footer__contact">
                <div className="footer__contact-item">
                  <MapPin size={16} />
                  <span>Av. Reforma #123, Col. Centro</span>
                </div>
                <div className="footer__contact-item">
                  <Phone size={16} />
                  <span>(555) 123-4567</span>
                </div>
                <div className="footer__contact-item">
                  <Mail size={16} />
                  <span>info@musicamasvida.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer__bottom">
          <p className="footer__copyright">
            © {new Date().getFullYear()} Música Más Vida. Todos los derechos reservados.
          </p>
          <div className="footer__legal">
            {FOOTER_LINKS.legal.map((link) => (
              <Link key={link.path} to={link.path} className="footer__legal-link">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
