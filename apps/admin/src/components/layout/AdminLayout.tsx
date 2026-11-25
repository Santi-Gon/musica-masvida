import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';

const SidebarToggleContext = createContext<{
  isOpen: boolean;
  toggle: () => void;
} | null>(null);

interface HeaderProps { title: string; subtitle?: string; }

export function PageHeader({ title, subtitle }: HeaderProps) {
  const sidebarToggle = useContext(SidebarToggleContext);

  return (
    <header className="top-header">
      <div className="header-main">
        <button
          type="button"
          className="mobile-menu-toggle"
          aria-label={sidebarToggle?.isOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
          aria-expanded={sidebarToggle?.isOpen ?? false}
          onClick={sidebarToggle?.toggle}
        >
          ☰
        </button>
        <div className="header-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export default function AdminLayout() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div className="loading-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return (
    <SidebarToggleContext.Provider
      value={{ isOpen: sidebarOpen, toggle: () => setSidebarOpen(open => !open) }}
    >
      <div className="admin-layout">
        {sidebarOpen && (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Cerrar menú lateral"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </SidebarToggleContext.Provider>
  );
}
