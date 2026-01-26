import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Notification } from '../types';
import { LogOut, LayoutDashboard, CalendarCheck, Users, Briefcase, ClipboardCheck, FileText, FileSpreadsheet, Bell, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { storageService } from '../services/storage';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  currentView: string;
  onChangeView: (view: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onChangeView }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Load notifications once on mount and when view changes (simpler than polling)
  useEffect(() => {
    loadNotifs();
  }, [user.id, currentView]);

  const loadNotifs = () => {
      const data = storageService.getUserNotifications(user.id);
      setNotifications(data);
  };

  const handleMarkRead = (id: string) => {
      storageService.markNotificationRead(id);
      loadNotifs();
  };

  const handleMarkAllRead = () => {
      storageService.markAllRead(user.id);
      loadNotifs();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const NavItem = ({ view, icon: Icon, label }: { view: string; icon: any; label: string }) => (
    <button
      onClick={() => onChangeView(view)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        currentView === view
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
          : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col md:flex-row overflow-x-hidden">
      {/* Sidebar - Added shrink-0 to prevent compression */}
      <aside className="w-full md:w-64 bg-slate-950/50 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-800 flex flex-col sticky top-0 z-50 shrink-0">
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center md:block">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              JENCO
            </h1>
            <p className="text-xs text-slate-500 tracking-widest uppercase mt-1">HR & Attendance</p>
          </div>
          
          {/* Mobile Bell */}
          <div className="md:hidden relative">
             <button onClick={() => setShowNotif(!showNotif)} className="p-2 text-slate-300 relative">
                 <Bell size={24} />
                 {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-slate-900"></span>
                 )}
             </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto hidden md:block">
          {isAdmin ? (
            <>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-4 mt-2">Overview</div>
              <NavItem view="dashboard" icon={LayoutDashboard} label="Tracking Center" />
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 px-4 mt-4">Management</div>
              <NavItem view="approvals" icon={ClipboardCheck} label="Approvals" />
              <NavItem view="staff" icon={Users} label="Staff Directory" />
              <NavItem view="reports" icon={FileSpreadsheet} label="Reports & Export" />
              <NavItem view="policy" icon={FileText} label="Policies & Settings" />
            </>
          ) : (
            <>
              <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem view="attendance" icon={CalendarCheck} label="Attendance" />
              <NavItem view="leaves" icon={Briefcase} label="Leaves" />
            </>
          )}
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden flex justify-around p-2 bg-slate-900 border-t border-slate-800 overflow-x-auto">
           <button onClick={() => onChangeView('dashboard')} className={`p-2 ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'}`}><LayoutDashboard /></button>
           {isAdmin && <button onClick={() => onChangeView('approvals')} className={`p-2 ${currentView === 'approvals' ? 'text-indigo-400' : 'text-slate-400'}`}><ClipboardCheck /></button>}
           <button onClick={() => onChangeView(isAdmin ? 'staff' : 'attendance')} className={`p-2 ${['staff', 'attendance'].includes(currentView) ? 'text-indigo-400' : 'text-slate-400'}`}><Users /></button>
        </div>

        <div className="p-4 border-t border-slate-800 hidden md:block">
          <div className="flex items-center space-x-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.fullName}</p>
              <p className="text-xs text-slate-500 truncate">{user.position}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center space-x-2 p-2 rounded-md bg-slate-800 text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut size={16} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Added min-w-0 to fix flex child overflow issues */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative min-w-0">
        <div className="hidden md:flex justify-end mb-6 relative z-50">
           <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotif(!showNotif)} className="relative p-2 text-slate-400 hover:text-white transition-colors bg-slate-800/50 rounded-full border border-slate-700">
                    <Bell size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white font-bold border-2 border-slate-900">
                            {unreadCount}
                        </span>
                    )}
                </button>
                
                {showNotif && (
                    <div className="absolute right-0 mt-3 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[100]">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-[10px] text-indigo-400 hover:text-indigo-300">Mark all read</button>
                            )}
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-500 text-sm">No notifications.</div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {notifications.map(n => (
                                        <div key={n.id} onClick={() => handleMarkRead(n.id)} className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${!n.isRead ? 'bg-slate-800/30 border-l-2 border-indigo-500' : 'opacity-60'}`}>
                                            <div className="flex gap-3">
                                                <div className="mt-1 shrink-0">
                                                    {n.type === 'success' && <CheckCircle size={16} className="text-green-400"/>}
                                                    {n.type === 'alert' && <AlertCircle size={16} className="text-red-400"/>}
                                                    {n.type === 'info' && <Info size={16} className="text-indigo-400"/>}
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-200 leading-snug">{n.message}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
           </div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
