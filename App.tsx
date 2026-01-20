import React, { useState, useEffect } from 'react';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { AttendancePanel } from './components/AttendancePanel';
import { LeaveForm } from './components/LeaveForm';
import { AdminDashboard } from './components/AdminDashboard';
import { User, UserRole, Entitlement } from './types';
import { storageService, PUBLIC_HOLIDAYS } from './services/storage';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState('dashboard');
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);

  useEffect(() => {
    const currentUser = storageService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === UserRole.STAFF) {
        setEntitlement(storageService.calculateEntitlement(user));
    }
  }, [user]);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView('dashboard');
  };

  const handleLogout = () => {
    storageService.logout();
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Dashboard Logic
  const renderContent = () => {
    // ADMIN VIEWS
    if (user.role === UserRole.ADMIN) {
        if (['dashboard', 'approvals', 'staff', 'policy'].includes(view)) {
            return <AdminDashboard view={view} />;
        }
    }
    
    // STAFF VIEWS
    switch (view) {
      case 'dashboard':
        return (
          <div className="space-y-8">
            <div className="mb-6">
               <h1 className="text-3xl font-bold text-white">Welcome back, {user.fullName.split(' ')[0]}</h1>
               <p className="text-slate-400">Here is your daily briefing.</p>
            </div>

            {/* Staff Leave Summary Widget */}
            {entitlement && (
                <div className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700/60 backdrop-blur-sm">
                    <h2 className="text-lg font-bold text-white mb-4">Your Leave Balances</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Annual Leave - Prominent */}
                        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-slate-400 text-xs uppercase font-bold mb-1">Annual Leave</div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-white">{entitlement.annualTotal - entitlement.annualUsed}</span>
                                <span className="text-sm text-slate-500 mb-1">/ {entitlement.annualTotal} days</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(entitlement.annualUsed / entitlement.annualTotal) * 100}%` }}></div>
                            </div>
                        </div>
                        {/* Replacement Leave */}
                         <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-slate-400 text-xs uppercase font-bold mb-1">Replacement Credit</div>
                            <div className="flex items-end gap-2">
                                <span className="text-3xl font-bold text-amber-400">{entitlement.replacementTotal - entitlement.replacementUsed}</span>
                                <span className="text-sm text-slate-500 mb-1">available</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-3">Earned via OT claims</div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div onClick={() => setView('attendance')} className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/20 p-6 rounded-2xl hover:border-indigo-500/50 cursor-pointer transition-all group">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Log Attendance</h3>
                    <p className="text-slate-400 text-sm">Check-in or Check-out via GPS.</p>
                </div>
                <div onClick={() => setView('leaves')} className="bg-gradient-to-br from-purple-900/50 to-slate-900 border border-purple-500/20 p-6 rounded-2xl hover:border-purple-500/50 cursor-pointer transition-all group">
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Apply Leave</h3>
                    <p className="text-slate-400 text-sm">Submit AL, MC, or Emergency Leave.</p>
                </div>
            </div>

            {/* Upcoming Holidays Widget for Staff */}
            <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/40">
                <h3 className="text-white font-bold mb-4">Upcoming Public Holidays</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {PUBLIC_HOLIDAYS.slice(0, 8).map((h, i) => (
                        <div key={i} className="bg-slate-900/80 p-3 rounded-lg border border-slate-700/50 flex flex-col justify-between h-24">
                            <span className="text-xs text-indigo-400 font-bold">{h.date}</span>
                            <span className="text-sm text-slate-200 leading-tight">{h.name}</span>
                        </div>
                    ))}
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex items-center justify-center">
                        <span className="text-xs text-slate-500">+5 More</span>
                    </div>
                </div>
            </div>
          </div>
        );
      case 'attendance':
        return <AttendancePanel user={user} />;
      case 'leaves':
        return <LeaveForm user={user} onSuccess={() => setView('dashboard')} />;
      case 'employees':
        // Fallback for logic consistency, though Admin logic handles this
        return <div>Access Restricted</div>; 
      default:
        return <div>View Not Found</div>;
    }
  };

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      currentView={view} 
      onChangeView={setView}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;