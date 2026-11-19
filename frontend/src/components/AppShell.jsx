import {
  Activity,
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldAlert,
  Ticket,
  UserRoundPlus,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const pageTitles = {
  '/dashboard': ['Overview', 'Your operations at a glance'],
  '/tickets': ['Tickets', 'Track and resolve customer issues'],
  '/tickets/new': ['Create ticket', 'Capture a new operations request'],
  '/register': ['Team members', 'Manage your organization team'],
  '/team': ['Team members', 'Manage your organization team'],
  '/sla': ['SLA operations', 'Monitor deadlines and ticket response risk'],
};

function pageTitle(pathname) {
  if (pathname.startsWith('/tickets/') && pathname !== '/tickets/new') {
    return ['Ticket details', 'Review and update this request'];
  }
  return pageTitles[pathname] || ['OpsDesk', 'Operations workspace'];
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [title, subtitle] = pageTitle(location.pathname);
  const initials = user?.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand">
          <span className="brand-mark"><Activity size={21} strokeWidth={2.5} /></span>
          <span>opsdesk<span className="brand-ai">.ai</span><small>TRAVEL OPERATIONS</small></span>
        </NavLink>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={18} /><span>Overview</span>
          </NavLink>
          <NavLink to="/tickets" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <Ticket size={18} /><span>Tickets</span>
          </NavLink>
          <NavLink to="/sla" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            <ShieldAlert size={18} /><span>SLA operations</span>
          </NavLink>
          {['ADMIN', 'MANAGER'].includes(user?.role) && (
            <NavLink to="/team" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <UserRoundPlus size={18} /><span>Team members</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-status"><span className="online-dot" /> API workspace</div>
          <div className="sidebar-user">
            <div className="avatar">{initials || 'U'}</div>
            <div className="sidebar-user-info">
              <strong>{user?.name}</strong>
              <span>{user?.role}</span>
            </div>
            <button className="icon-button logout-button" title="Sign out" aria-label="Sign out" onClick={() => {
              logout();
              navigate('/login', { replace: true });
            }}><LogOut size={17} /></button>
          </div>
        </div>
      </aside>
      <main className="main-panel">
        <header className="topbar">
          <div className="page-heading">
            <span className="eyebrow">{user?.organization?.name || 'Operations workspace'}</span>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="topbar-actions">
            <span className="live-indicator"><span className="online-dot" /> Live data</span>
            <button className="button button-primary topbar-create" onClick={() => navigate('/tickets/new')}>
              <Plus size={17} /> New ticket <ArrowUpRight size={15} />
            </button>
          </div>
        </header>
        <div className="content"><Outlet /></div>
      </main>
    </div>
  );
}
