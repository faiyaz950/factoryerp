import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { searchAPI, notificationAPI } from '../services/api';
import {
  LayoutDashboard, Factory, Package, Users, FileText, CreditCard,
  Receipt, BarChart3, UserCog, ClipboardList, Menu, Search, Bell,
  LogOut, ChevronLeft, X, Check, CheckCheck
} from 'lucide-react';

export default function Layout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchRef = useRef(null);
  const notifRef = useRef(null);

  const adminNav = [
    { section: 'Main', items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/production', icon: Factory, label: 'Production' },
      { to: '/materials', icon: Package, label: 'Materials' },
    ]},
    { section: 'Business', items: [
      { to: '/parties', icon: Users, label: 'Parties' },
      { to: '/billing', icon: FileText, label: 'Billing' },
      { to: '/expenses', icon: Receipt, label: 'Expenses' },
    ]},
    { section: 'Analytics', items: [
      { to: '/reports', icon: BarChart3, label: 'Reports' },
    ]},
    { section: 'Admin', items: [
      { to: '/users', icon: UserCog, label: 'User Mgmt' },
      { to: '/activity-logs', icon: ClipboardList, label: 'Activity Logs' },
    ]},
  ];

  const supervisorNav = [
    { section: 'Main', items: [
      { to: '/production', icon: Factory, label: 'Production' },
      { to: '/materials', icon: Package, label: 'Materials' },
      { to: '/expenses', icon: Receipt, label: 'Expenses' },
    ]},
  ];

  const navSections = isAdmin ? adminNav : supervisorNav;

  // Search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await searchAPI.global(searchQuery);
        setSearchResults(res.data);
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchResults(null);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch unread count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await notificationAPI.unreadCount();
        setUnreadCount(res.data.count);
      } catch (e) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNotifClick = async () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      try {
        const res = await notificationAPI.list();
        setNotifications(res.data.data || []);
      } catch (e) {}
    }
  };

  const markAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications(n => n.map(x => ({ ...x, is_read: true })));
    } catch (e) {}
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearchSelect = (type, item) => {
    setSearchQuery('');
    setSearchResults(null);
    switch (type) {
      case 'parties': navigate('/parties'); break;
      case 'invoices': navigate('/billing'); break;
      case 'productions': navigate('/production'); break;
      case 'materials': navigate('/materials'); break;
    }
  };

  // Close mobile on nav
  useEffect(() => { setMobileOpen(false); }, [location]);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">🏭</div>
          <div className="brand-text">
            <h2>FactoryERP</h2>
            <p>Plastic Manufacturing</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon"><item.icon size={18} /></span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <div className="user-info">
            <p>{user?.name}</p>
            <small>{user?.role}</small>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && <div className="mobile-overlay" onClick={() => setMobileOpen(false)} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99
      }} />}

      {/* Navbar */}
      <header className={`navbar ${collapsed ? 'collapsed' : ''}`}>
        <div className="navbar-left">
          <button className="navbar-toggle" onClick={() => {
            if (window.innerWidth <= 768) setMobileOpen(!mobileOpen);
            else setCollapsed(!collapsed);
          }}>
            {collapsed || mobileOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>

          <div className="search-bar" ref={searchRef} style={{ position: 'relative' }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search parties, invoices, materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults && (
              <div className="search-results">
                {Object.entries(searchResults).map(([type, items]) =>
                  items?.length > 0 && (
                    <div key={type}>
                      <div className="search-category">{type}</div>
                      {items.map((item) => (
                        <div key={item.id} className="search-result-item" onClick={() => handleSearchSelect(type, item)}>
                          <span>{item.name || item.invoice_number || item.item || item.code}</span>
                          {item.company_name && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> — {item.company_name}</span>}
                        </div>
                      ))}
                    </div>
                  )
                )}
                {Object.values(searchResults).every(arr => !arr?.length) && (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No results found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="navbar-right">
          <div style={{ position: 'relative' }} ref={notifRef}>
            <button className="nav-btn" onClick={handleNotifClick}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                      <CheckCheck size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className={`notification-item ${!n.is_read ? 'unread' : ''}`}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-message">{n.message}</div>
                      <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="nav-btn" onClick={handleLogout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <div className="page-content animate-fade">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
