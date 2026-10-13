import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import QRScannerModal from '../components/QRScannerModal';
import { getFileUrl } from '../services/api';
import {
  LayoutDashboard, Stethoscope, Building2, Wrench, AlertCircle, Gauge,
  ShieldCheck, Briefcase, BarChart3, Users, User, LogOut, Menu,
  ChevronLeft, Bell, X, CheckCircle, AlertTriangle, Info, Plus,
  ClipboardList, FileText, Package, ChevronDown, QrCode
} from 'lucide-react';

// Role-specific nav (Profile & Notifications are in the header only)
const NAV_CONFIG = {
  'Admin': [
    { name: 'Dashboard',      path: '/dashboard',    icon: LayoutDashboard },
    { name: 'Equipment',      path: '/equipment',    icon: Stethoscope },
    { name: 'Maintenance',    path: '/maintenance',  icon: Wrench },
    { name: 'Complaints',     path: '/complaints',   icon: AlertCircle },
    { name: 'Calibration',    path: '/calibration',  icon: Gauge },
    { name: 'Departments',    path: '/departments',  icon: Building2 },
    { name: 'Vendors',        path: '/vendors',      icon: Briefcase },
    { name: 'Warranty & AMC', path: '/warranty-amc', icon: ShieldCheck },
    { name: 'Reports',        path: '/reports',      icon: BarChart3 },
    { name: 'Users',          path: '/users',        icon: Users },
  ],
  'Biomedical Engineer': [
    { name: 'Dashboard',   path: '/dashboard',   icon: LayoutDashboard },
    { name: 'Equipment',   path: '/equipment',   icon: Stethoscope },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench },
    { name: 'Complaints',  path: '/complaints',  icon: AlertCircle },
    { name: 'Calibration', path: '/calibration', icon: Gauge },
  ],
  'Department Staff': [
    { name: 'Dashboard',       path: '/dashboard',       icon: LayoutDashboard },
    { name: 'My Equipment',    path: '/equipment',       icon: Stethoscope },
    { name: 'Raise Complaint', path: '/raise-complaint', icon: Plus },
    { name: 'My Complaints',   path: '/my-complaints',   icon: ClipboardList },
  ],
  'Vendor': [
    { name: 'Dashboard',          path: '/dashboard',        icon: LayoutDashboard },
    { name: 'Assigned Equipment', path: '/equipment',        icon: Package },
    { name: 'Service Requests',   path: '/service-requests', icon: Wrench },
    { name: 'Service Reports',    path: '/service-reports',  icon: FileText },
  ],
};

const ROLE_COLORS = {
  'Admin':               'from-blue-600 to-indigo-700',
  'Biomedical Engineer': 'from-blue-600 to-indigo-700',
  'Department Staff':    'from-blue-600 to-indigo-700',
  'Vendor':              'from-blue-600 to-indigo-700',
};

const ROLE_BADGES = {
  'Admin':               'bg-blue-100 text-blue-700',
  'Biomedical Engineer': 'bg-blue-100 text-blue-700',
  'Department Staff':    'bg-blue-100 text-blue-700',
  'Vendor':              'bg-blue-100 text-blue-700',
};

const getPageTitle = (pathname, role) => {
  const map = {
    '/dashboard':        'Dashboard',
    '/maintenance':      'Maintenance',
    '/complaints':       'Complaints',
    '/calibration':      'Calibration',
    '/departments':      'Departments',
    '/vendors':          'Vendors',
    '/warranty-amc':     'Warranty & AMC',
    '/reports':          'Reports',
    '/users':            'Users',
    '/notifications':    'Notifications',
    '/profile':          'My Profile',
    '/raise-complaint':  'Raise Complaint',
    '/my-complaints':    'My Complaints',
    '/service-requests': 'Service Requests',
    '/service-reports':  'Service Reports',
  };
  if (pathname === '/equipment') {
    if (role === 'Vendor') return 'Assigned Equipment';
    if (role === 'Department Staff' || role === 'Biomedical Engineer') return 'My Equipment';
    return 'Equipment';
  }
  if (pathname.startsWith('/equipment/')) return 'Equipment Details';
  return map[pathname] || 'HAMS Portal';
};

const getCategoryIcon = (category) => {
  switch (category) {
    case 'Critical': return <AlertTriangle className="text-red-500 h-4 w-4" />;
    case 'Warning':  return <AlertTriangle className="text-amber-500 h-4 w-4" />;
    case 'Success':  return <CheckCircle className="text-emerald-500 h-4 w-4" />;
    default:         return <Info className="text-blue-500 h-4 w-4" />;
  }
};

export default function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [collapsed, setCollapsed]     = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const notifRef   = useRef(null);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target))     setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { setProfileOpen(false); logout(); navigate('/login'); };

  const navItems  = NAV_CONFIG[user?.role] || [];
  const roleColor = ROLE_COLORS[user?.role] || 'from-blue-600 to-indigo-700';
  const roleBadge = ROLE_BADGES[user?.role] || 'bg-blue-100 text-blue-700';
  const title     = getPageTitle(location.pathname, user?.role);

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shadow-sm ${collapsed ? 'w-[70px]' : 'w-64'}`}>

        {/* Brand */}
        <div className={`h-16 border-b border-slate-100 flex items-center px-4 gap-3 bg-gradient-to-r ${roleColor}`}>
          <div className="h-8 w-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm">H</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-extrabold text-base leading-tight">HAMS Portal</p>
              <p className="text-white/80 text-xs font-medium">Equipment Lifecycle</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/80 hover:text-white transition-colors flex-shrink-0"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* User info (when expanded) */}
        {!collapsed && (
          <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                {user?.profileImage
                  ? <img src={getFileUrl(user.profileImage)} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
                  : <User className="h-5 w-5 text-slate-500" />
                }
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.name}</p>
                <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-md ${roleBadge}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path + item.name}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? `bg-gradient-to-r ${roleColor} text-white shadow-sm`
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
              title={collapsed ? item.name : ''}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title="Logout"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? 'pl-[70px]' : 'pl-64'}`}>

        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{title}</h1>

          <div className="flex items-center gap-3">
            {/* Scan QR Button */}
            <button
              onClick={() => setScannerOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-sm font-bold transition-all border border-blue-200 shadow-sm"
              title="Scan Equipment QR Code"
            >
              <QrCode className="h-4.5 w-4.5 text-blue-600" />
              <span className="hidden sm:inline">Scan QR</span>
            </button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-600 relative transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-88 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50">
                  <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                    <span className="text-base font-bold text-slate-800">Notifications</span>
                    <div className="flex items-center gap-3">
                      <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-700 font-bold">Mark all read</button>
                      <button onClick={() => setNotifOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-sm font-medium">No notifications</div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n._id}
                          className={`p-3.5 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/40' : ''}`}
                          onClick={() => markAsRead(n._id)}
                        >
                          <div className="mt-0.5 flex-shrink-0">{getCategoryIcon(n.category)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-tight">{n.title}</p>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                            <span className="text-xs text-slate-400 mt-1 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                          </div>
                          {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu Dropdown */}
            <div className="relative pl-3 border-l border-slate-200" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                  {user?.profileImage
                    ? <img src={getFileUrl(user.profileImage)} alt="avatar" className="h-9 w-9 object-cover" />
                    : <User className="h-5 w-5 text-slate-600" />
                  }
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-slate-800 leading-tight">{user?.name?.split(' ').slice(0, 2).join(' ')}</p>
                  <p className="text-xs text-slate-500 font-semibold">{user?.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-50 py-1.5">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>
                  <NavLink
                    to="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    <User className="h-4.5 w-4.5 text-slate-400" />
                    My Profile
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-semibold text-left border-t border-slate-100"
                  >
                    <LogOut className="h-4.5 w-4.5 text-red-500" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} />

      {/* Backdrop for notifications */}
      {notifOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setNotifOpen(false)} />
      )}
    </div>
  );
}
