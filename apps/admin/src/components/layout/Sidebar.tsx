import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/dashboard', icon: '📊', label: 'Dashboard' },
  { to: '/events',   icon: '🎵', label: 'Eventos' },
  { to: '/teachers', icon: '👨‍🏫', label: 'Maestros' },
  { to: '/pricing',  icon: '💰', label: 'Precios' },
  { to: '/users',    icon: '👤', label: 'Usuarios' },
  { to: '/tickets',  icon: '🎫', label: 'Tickets' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`sidebar${isOpen ? ' sidebar--open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🎼</div>
        <div className="sidebar-logo-text">
          <strong>Música Más Vida</strong>
          <span>Panel Admin</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Principal</span>
        {navItems.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            onClick={onClose}
          >
            <span className="nav-icon">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="sidebar-user-info">
            <strong>{user?.name || 'Admin'}</strong>
            <span>{user?.email}</span>
          </div>
        </div>
        <button id="btn-logout" className="btn-logout" onClick={() => { onClose(); handleLogout(); }}>
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
