import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole, Notification, LeaveStatus } from '../types';
import { LogOut, LayoutDashboard, CalendarCheck, Users, Briefcase, ClipboardCheck, FileText, FileSpreadsheet, Bell, CheckCircle, AlertCircle, Info, Check, X } from 'lucide-react';
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

  // Poll for notifications
  useEffect(() => {
    loadNotifs();
    const interval = setInterval(loadNotifs, 5000); // Check every 5s
    
    // Also listen for immediate updates
    const handleDataUpdate = () => loadNotifs();
    window.addEventListener('jenco-data-update', handleDataUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('jenco-data-update', handleDataUpdate);
    };
  }, [user.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
            setShowNotif(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const handleQuickAction = async (e: React.MouseEvent, n: Notification, status: LeaveStatus) => {
      e.stopPropagation(); // Prevent triggering the navigate logic
      if (!n.relatedId || !n.relatedType) return;

      if (n.relatedType === 'LEAVE') {
          await storageService.updateLeaveStatus(n.relatedId, status);
      } else if (n.relatedType === 'CLAIM') {
          await storageService.updateClaimStatus(n.relatedId, status);
      }
      
      handleMarkRead(n.id); // Mark read after action
      
      // Dispatch global event to refresh dashboards without navigation
      window.dispatchEvent(new Event('jenco-data-update'));
  };

  const handleNotificationClick = (n: Notification) => {
      handleMarkRead(n.id);
      if (isAdmin && (n.relatedType === 'LEAVE' || n.relatedType === 'CLAIM')) {
          onChangeView('approvals');
      }
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
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row">
      {/* Sidebar / Mobile Header */}
      <aside className="w-full md:w-64 bg-slate-950/50 backdrop-blur-xl border-b md:border-b-0 md:border-r border-slate-800 flex flex-col sticky top-0 z-50">
        <div className="p-6 border-b border-slate-800 bg-slate-950/80 flex justify-between items-center md:block">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
              JENCO
            </h1>
            <p className="text-xs text-slate-500 tracking-widest uppercase mt-1">HR & Attendance</p>
          </div>
          
          {/* Mobile Bell */}
          <div className="md:hidden relative" ref={notifRef}>
             <button onClick={() => setShowNotif(!showNotif)} className="p-2 text-slate-300 relative">
                 <Bell size={24} />
                 {unreadCount > 0 && (
                     <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-slate-900"></span>
                 )}
             </button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto hidden md:block">
          
          {/* Admin Navigation */}
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
            /* Staff Navigation */
            <>
              <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <NavItem view="attendance" icon={CalendarCheck} label="Attendance" />
              <NavItem view="leaves" icon={Briefcase} label="Leaves" />
            </>
          )}
        </nav>

        {/* Mobile Nav */}
        <div className="md:hidden flex justify-around p-2 bg-slate-900 border-t border-slate-800 overflow-x-auto">
           {isAdmin ? (
             <>
                <button onClick={() => onChangeView('dashboard')} className={`p-2 ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'}`}><LayoutDashboard /></button>
                <button onClick={() => onChangeView('approvals')} className={`p-2 ${currentView === 'approvals' ? 'text-indigo-400' : 'text-slate-400'}`}><ClipboardCheck /></button>
                <button onClick={() => onChangeView('staff')} className={`p-2 ${currentView === 'staff' ? 'text-indigo-400' : 'text-slate-400'}`}><Users /></button>
                <button onClick={() => onChangeView('reports')} className={`p-2 ${currentView === 'reports' ? 'text-indigo-400' : 'text-slate-400'}`}><FileSpreadsheet /></button>
             </>
           ) : (
             <>
                <button onClick={() => onChangeView('dashboard')} className={`p-2 ${currentView === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'}`}><LayoutDashboard /></button>
                <button onClick={() => onChangeView('attendance')} className={`p-2 ${currentView === 'attendance' ? 'text-indigo-400' : 'text-slate-400'}`}><CalendarCheck /></button>
                <button onClick={() => onChangeView('leaves')} className={`p-2 ${currentView === 'leaves' ? 'text-indigo-400' : 'text-slate-400'}`}><Briefcase /></button>
             </>
           )}
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
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 p-2 rounded-md bg-slate-800 text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
        </div>
        
        {/* Desktop Header / Notifications */}
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
                
                {/* Notification Dropdown */}
                {showNotif && (
                    <div className="absolute right-0 mt-3 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                        <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                            {unreadCount > 0 && (
                                <button onClick={handleMarkAllRead} className="text-[10px] text-indigo-400 hover:text-indigo-300">Mark all read</button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-500 text-sm">No notifications.</div>
                            ) : (
                                <div className="divide-y divide-slate-800">
                                    {notifications.map(n => (
                                        <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${!n.isRead ? 'bg-slate-800/30 border-l-2 border-indigo-500' : 'opacity-60'}`}>
                                            <div className="flex gap-3">
                                                <div className="mt-1 shrink-0">
                                                    {n.type === 'success' && <CheckCircle size={16} className="text-green-400"/>}
                                                    {n.type === 'alert' && <AlertCircle size={16} className="text-red-400"/>}
                                                    {n.type === 'info' && <Info size={16} className="text-indigo-400"/>}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-200 leading-snug">{n.message}</p>
                                                    <p className="text-[10px] text-slate-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                                                    
                                                    {/* Quick Actions for Admins */}
                                                    {isAdmin && n.relatedId && n.relatedType && !n.isRead && (
                                                        <div className="flex gap-2 mt-2">
                                                            <button 
                                                                onClick={(e) => handleQuickAction(e, n, LeaveStatus.APPROVED)} 
                                                                className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs font-bold border border-green-500/30"
                                                            >
                                                                <Check size={12}/> Approve
                                                            </button>
                                                            <button 
                                                                onClick={(e) => handleQuickAction(e, n, LeaveStatus.REJECTED)} 
                                                                className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs font-bold border border-red-500/30"
                                                            >
                                                                <X size={12}/> Reject
                                                            </button>
                                                            <span className="text-[10px] text-slate-500 flex items-center ml-auto">
                                                                Click body to view details
                                                            </span>
                                                        </div>
                                                    )}
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

        {/* Mobile Notification Dropdown (Separate logic to handle positioning) */}
        {showNotif && (
            <div className="md:hidden fixed top-16 left-4 right-4 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Notifications</h4>
                    {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-[10px] text-indigo-400 hover:text-indigo-300">Mark all read</button>
                    )}
                    <button onClick={() => setShowNotif(false)} className="text-slate-500"><LogOut size={16} className="rotate-180"/></button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">No notifications.</div>
                    ) : (
                        <div className="divide-y divide-slate-800">
                            {notifications.map(n => (
                                <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${!n.isRead ? 'bg-slate-800/30 border-l-2 border-indigo-500' : 'opacity-60'}`}>
                                    <div className="flex gap-3">
                                        <div className="mt-1 shrink-0">
                                            {n.type === 'success' && <CheckCircle size={16} className="text-green-400"/>}
                                            {n.type === 'alert' && <AlertCircle size={16} className="text-red-400"/>}
                                            {n.type === 'info' && <Info size={16} className="text-indigo-400"/>}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-200 leading-snug">{n.message}</p>
                                            <p className="text-[10px] text-slate-500 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                                             {/* Quick Actions for Admins */}
                                             {isAdmin && n.relatedId && n.relatedType && !n.isRead && (
                                                <div className="flex gap-2 mt-2">
                                                    <button 
                                                        onClick={(e) => handleQuickAction(e, n, LeaveStatus.APPROVED)} 
                                                        className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs font-bold border border-green-500/30"
                                                    >
                                                        <Check size={12}/> Approve
                                                    </button>
                                                    <button 
                                                        onClick={(e) => handleQuickAction(e, n, LeaveStatus.REJECTED)} 
                                                        className="flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs font-bold border border-red-500/30"
                                                    >
                                                        <X size={12}/> Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}
        
        <div className="relative z-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};