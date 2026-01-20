import React, { useState, useEffect } from 'react';
import { User, LeaveRequest, AttendanceRecord, LeaveStatus, UserRole, ReplacementClaim, PublicHoliday } from '../types';
import { storageService, PUBLIC_HOLIDAYS } from '../services/storage';
import { Check, X, UserPlus, Trash2, MapPin, Edit2, Key, Calendar, Briefcase, UserX, AlertCircle, FileText, History, TrendingUp, TrendingDown, FileSpreadsheet, Download } from 'lucide-react';

interface Props {
  view: string;
}

export const AdminDashboard: React.FC<Props> = ({ view }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([]);
  const [allLeaves, setAllLeaves] = useState<LeaveRequest[]>([]);
  const [pendingClaims, setPendingClaims] = useState<ReplacementClaim[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [todayLeaves, setTodayLeaves] = useState<LeaveRequest[]>([]);
  
  // Employee Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [empForm, setEmpForm] = useState({ 
      fullName: '', 
      username: '', 
      password: '', 
      position: '', 
      joiningDate: ''
  });

  // Adjustment State
  const [adjType, setAdjType] = useState<'Annual Leave' | 'Replacement Credit'>('Annual Leave');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('');

  // Report State
  const [reportType, setReportType] = useState<'ATTENDANCE' | 'LEAVES'>('ATTENDANCE');
  const [reportPeriod, setReportPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    refreshData();
  }, [view]);

  const refreshData = () => {
    const users = storageService.getEmployees();
    setEmployees(users);
    
    // Leaves
    const leaves = storageService.getLeaves();
    setAllLeaves(leaves);
    setPendingLeaves(leaves.filter(l => l.status === LeaveStatus.PENDING));
    
    // Filter Today's Absentees
    const todayStr = new Date().toISOString().split('T')[0];
    const absents = leaves.filter(l => 
        l.status === LeaveStatus.APPROVED && 
        l.startDate <= todayStr && 
        l.endDate >= todayStr
    );
    setTodayLeaves(absents);

    // Claims
    setPendingClaims(storageService.getClaims().filter(c => c.status === LeaveStatus.PENDING));

    // Attendance
    setAttendanceLogs(storageService.getAttendance());
  };

  const handleApproval = async (id: string, status: LeaveStatus, isClaim = false) => {
    if (isClaim) {
        await storageService.updateClaimStatus(id, status);
    } else {
        await storageService.updateLeaveStatus(id, status);
    }
    refreshData();
  };

  const handleSubmitEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    // For CREATE or Basic UPDATE
    if (editingId) {
        const original = employees.find(e => e.id === editingId);
        if (!original) return;

        const updatedUser: User = {
            ...original,
            fullName: empForm.fullName,
            username: empForm.username,
            password: empForm.password,
            position: empForm.position,
            joiningDate: empForm.joiningDate,
        };
        storageService.updateEmployee(updatedUser);
        setEditingId(null);
    } else {
        const user: User = {
            id: Date.now().toString(),
            role: UserRole.STAFF,
            fullName: empForm.fullName,
            username: empForm.username,
            password: empForm.password,
            position: empForm.position,
            joiningDate: empForm.joiningDate,
            leaveAdjustments: { annualLeaveAdjustment: 0, replacementLeaveBalance: 0 },
            adjustmentLogs: []
        };
        storageService.addEmployee(user);
    }
    setEmpForm({ fullName: '', username: '', password: '', position: '', joiningDate: '' });
    refreshData();
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || adjAmount === 0 || !adjReason) {
        alert("Please enter amount and reason.");
        return;
    }
    const currentUser = storageService.getCurrentUser();
    await storageService.adjustUserBalance(currentUser?.fullName || 'Admin', editingId, adjType, adjAmount, adjReason);
    setAdjAmount(0);
    setAdjReason('');
    refreshData();
  };

  const handleEditClick = (user: User) => {
    setEditingId(user.id);
    setEmpForm({
        fullName: user.fullName,
        username: user.username,
        password: user.password || '',
        position: user.position,
        joiningDate: user.joiningDate
    });
    setAdjAmount(0);
    setAdjReason('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteEmployee = (id: string) => {
    if(confirm("Are you sure? This action cannot be undone.")) {
        storageService.deleteEmployee(id);
        refreshData();
    }
  };

  // --- REPORT GENERATION ---
  const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
      const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExport = () => {
      const isMonthly = reportPeriod === 'MONTHLY';
      const filterStr = isMonthly ? reportDate : String(reportYear);
      
      if (reportType === 'ATTENDANCE') {
          const filtered = attendanceLogs.filter(log => log.date.startsWith(filterStr));
          const headers = ['Date', 'Staff Name', 'Check In', 'Check Out', 'Status', 'Location'];
          const rows = filtered.map(log => {
             const user = employees.find(e => e.id === log.userId);
             return [
                 log.date,
                 user?.fullName || 'Unknown',
                 new Date(log.checkInTime).toLocaleTimeString(),
                 log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString() : '-',
                 log.status,
                 log.location
             ];
          });
          downloadCSV(headers, rows, `Jenco_Attendance_${filterStr}.csv`);
      } else {
          // Leaves
          const filtered = allLeaves.filter(leave => leave.startDate.startsWith(filterStr));
          const headers = ['Staff Name', 'Leave Type', 'Start Date', 'End Date', 'Duration', 'Status', 'Reason', 'Applied On'];
          const rows = filtered.map(leave => [
              leave.userName,
              leave.type,
              leave.startDate,
              leave.endDate,
              leave.duration,
              leave.status,
              leave.reason,
              new Date(leave.appliedAt).toLocaleDateString()
          ]);
          downloadCSV(headers, rows, `Jenco_Leaves_${filterStr}.csv`);
      }
  };

  const getEditingUser = () => employees.find(e => e.id === editingId);

  const stats = (() => {
    const today = new Date().toISOString().split('T')[0];
    const staff = employees.filter(e => e.role === UserRole.STAFF);
    const checkedInToday = attendanceLogs.filter(l => l.date === today);
    const distinctCheckedIn = new Set(checkedInToday.map(r => r.userId)).size;
    const onLeave = todayLeaves.length;
    const missing = staff.length - distinctCheckedIn - onLeave;
    const dayOfWeek = new Date().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return { totalStaff: staff.length, checkedIn: distinctCheckedIn, onLeave, missing, isWeekend };
  })();

  // --- Render Sections Based on Prop ---

  return (
    <div className="space-y-6">
      
      {/* TRACKING / DASHBOARD */}
      {view === 'dashboard' && (
        <div className="space-y-6">
             <div className="mb-2">
                <h1 className="text-2xl font-bold text-white">Tracking Center</h1>
                <p className="text-slate-400 text-sm">Real-time attendance and absence monitoring.</p>
             </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                     <div className="absolute right-[-10px] top-[-10px] text-slate-700 opacity-50"><Briefcase size={80}/></div>
                     <h4 className="text-slate-400 text-sm font-medium relative z-10">On Leave Today</h4>
                     <div className="text-3xl font-bold text-white mt-1 relative z-10">{stats.onLeave}</div>
                     {todayLeaves.length > 0 && (
                         <div className="mt-2 text-xs text-indigo-300">
                             {todayLeaves.map(l => l.userName).join(', ')}
                         </div>
                     )}
                 </div>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                     <div className="absolute right-[-10px] top-[-10px] text-slate-700 opacity-50"><MapPin size={80}/></div>
                     <h4 className="text-slate-400 text-sm font-medium relative z-10">Checked In</h4>
                     <div className="text-3xl font-bold text-white mt-1 relative z-10">{stats.checkedIn} <span className="text-sm text-slate-500">/ {stats.totalStaff}</span></div>
                 </div>
                 <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 relative overflow-hidden">
                     <div className="absolute right-[-10px] top-[-10px] text-slate-700 opacity-50"><UserX size={80}/></div>
                     <h4 className="text-slate-400 text-sm font-medium relative z-10">Absent / Not In</h4>
                     <div className={`text-3xl font-bold mt-1 relative z-10 ${stats.missing > 0 && !stats.isWeekend ? 'text-rose-400' : 'text-white'}`}>
                        {stats.missing < 0 ? 0 : stats.missing}
                     </div>
                     {stats.isWeekend && <span className="text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Weekend</span>}
                 </div>
            </div>
            <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                <div className="p-4 border-b border-slate-700 font-bold text-white bg-slate-900/50">Full Attendance Log</div>
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-900 text-slate-200 uppercase text-xs">
                    <tr>
                      <th className="p-4">Staff</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Time In/Out</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Location</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {attendanceLogs.map(log => {
                      const user = employees.find(e => e.id === log.userId);
                      return (
                        <tr key={log.id} className="hover:bg-slate-700/30">
                          <td className="p-4 font-medium text-white">{user?.fullName || log.userId}</td>
                          <td className="p-4">{log.date}</td>
                          <td className="p-4">
                              <div className="flex flex-col">
                                  <span className="text-white">{new Date(log.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  {log.checkOutTime && <span className="text-xs opacity-70">{new Date(log.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                              </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${log.status === 'Incomplete Hours' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-500/10 text-green-400'}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="p-4 truncate max-w-xs" title={log.location}>
                              <div className="flex items-center gap-1">
                                  <MapPin size={12} /> {log.location}
                              </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
        </div>
      )}

      {/* APPROVALS */}
      {view === 'approvals' && (
        <div className="grid gap-6">
          <div className="mb-2">
                <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
                <p className="text-slate-400 text-sm">Review leave requests and replacement credit claims.</p>
          </div>

          <div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Briefcase size={18}/> Leave Requests</h3>
              {pendingLeaves.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-800/50 p-4 rounded-lg">No pending leave requests.</div>
              ) : (
                <div className="grid gap-4">
                    {pendingLeaves.map(leave => (
                      <div key={leave.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold text-white">{leave.userName}</h4>
                              <span className="text-sm bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">{leave.type}</span>
                          </div>
                          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                             <Calendar size={14} /> 
                             {leave.startDate} {leave.endDate !== leave.startDate && ` to ${leave.endDate}`}
                             <span className="text-slate-600">|</span>
                             {leave.duration}
                          </p>
                          <p className="text-slate-300 mt-2 bg-slate-900/50 p-2 rounded text-sm border border-slate-700/50 italic">"{leave.reason}"</p>
                          {leave.attachmentUrl && (
                            <a href={leave.attachmentUrl} target="_blank" className="text-indigo-400 text-xs mt-2 block hover:underline">View Attachment (MC)</a>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproval(leave.id, LeaveStatus.APPROVED)} className="p-3 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white rounded-lg border border-green-500/30"><Check size={20} /></button>
                          <button onClick={() => handleApproval(leave.id, LeaveStatus.REJECTED)} className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg border border-red-500/30"><X size={20} /></button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
          </div>
          <div>
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><AlertCircle size={18} className="text-amber-400"/> Replacement Claims</h3>
              {pendingClaims.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-800/50 p-4 rounded-lg">No pending claims.</div>
              ) : (
                <div className="grid gap-4">
                    {pendingClaims.map(claim => (
                      <div key={claim.id} className="bg-slate-800 p-6 rounded-xl border border-amber-500/20 flex flex-col md:flex-row justify-between items-start gap-4 shadow-lg shadow-amber-900/10">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                              <h4 className="text-lg font-bold text-white">{claim.userName}</h4>
                              <span className="text-sm bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">Claiming Credit</span>
                          </div>
                          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                             Worked on: <span className="text-white font-bold">{claim.workDate}</span>
                             <span className="text-slate-600">|</span>
                             Duration: {claim.duration}
                          </p>
                          <p className="text-slate-300 mt-2 bg-slate-900/50 p-2 rounded text-sm border border-slate-700/50 italic">"{claim.description}"</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleApproval(claim.id, LeaveStatus.APPROVED, true)} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-sm">Approve Credit</button>
                          <button onClick={() => handleApproval(claim.id, LeaveStatus.REJECTED, true)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm">Reject</button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
          </div>
        </div>
      )}

      {/* STAFF MAINTENANCE */}
      {view === 'staff' && (
        <div className="space-y-6">
           <div className="mb-2">
                <h1 className="text-2xl font-bold text-white">Staff Management</h1>
                <p className="text-slate-400 text-sm">Create, edit, and manage employee accounts and balances.</p>
           </div>

          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                {editingId ? <Edit2 size={20} className="text-amber-400"/> : <UserPlus size={20} className="text-indigo-400"/>} 
                {editingId ? 'Edit Staff Details' : 'Add New Staff'}
            </h3>
            
            {/* Top: Profile Edit */}
            <form onSubmit={handleSubmitEmployee}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end mb-4">
                    <div className="w-full">
                        <label className="text-xs text-slate-500 mb-1 block">Full Name</label>
                        <input placeholder="Full Name" required value={empForm.fullName} onChange={e => setEmpForm({...empForm, fullName: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm w-full"/>
                    </div>
                    <div className="w-full">
                        <label className="text-xs text-slate-500 mb-1 block">Username</label>
                        <input placeholder="Username" required value={empForm.username} onChange={e => setEmpForm({...empForm, username: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm w-full"/>
                    </div>
                    <div className="w-full">
                        <label className="text-xs text-slate-500 mb-1 block">Password</label>
                        <input placeholder="Password" required type="text" value={empForm.password} onChange={e => setEmpForm({...empForm, password: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm w-full font-mono text-indigo-300"/>
                    </div>
                    <div className="w-full">
                        <label className="text-xs text-slate-500 mb-1 block">Position</label>
                        <input placeholder="Position" required value={empForm.position} onChange={e => setEmpForm({...empForm, position: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm w-full"/>
                    </div>
                    <div className="w-full">
                        <label className="text-xs text-slate-500 mb-1 block">Joining Date</label>
                        <input type="date" required value={empForm.joiningDate} onChange={e => setEmpForm({...empForm, joiningDate: e.target.value})} className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm w-full"/>
                    </div>
                </div>
                
                <div className="flex items-end gap-2 justify-end mb-6 border-b border-slate-700/50 pb-6">
                    <button type="submit" className={`${editingId ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'} text-white py-2 px-6 rounded-lg transition-colors font-bold text-sm shadow-lg`}>
                        {editingId ? 'Update Profile' : 'Create Account'}
                    </button>
                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setEmpForm({ fullName: '', username: '', password: '', position: '', joiningDate: '' }); }} className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center"><X size={20} /></button>
                    )}
                </div>
            </form>

            {/* Bottom: Adjustment Panel (Only when editing) */}
            {editingId && (
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-4">
                        <History className="text-indigo-400" size={20}/>
                        <h4 className="font-bold text-white text-sm uppercase tracking-wider">Leave Balance Adjustment & History</h4>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Left: Make Adjustment */}
                        <div>
                             <h5 className="text-xs text-slate-500 mb-2 font-bold uppercase">Make Adjustment (Black & White)</h5>
                             <form onSubmit={handleAdjustment} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Type</label>
                                    <select value={adjType} onChange={(e) => setAdjType(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white">
                                        <option value="Annual Leave">Annual Leave</option>
                                        <option value="Replacement Credit">Replacement Credit</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Amount (+/-)</label>
                                        <input type="number" step="0.5" value={adjAmount} onChange={(e) => setAdjAmount(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="0"/>
                                    </div>
                                    <div className="flex items-end">
                                        <span className="text-xs text-slate-500 mb-2">e.g. -1 to deduct, 5 to add</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Reason (Required)</label>
                                    <input type="text" required value={adjReason} onChange={(e) => setAdjReason(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white" placeholder="e.g. Correction / Bonus / Carry Forward"/>
                                </div>
                                <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-indigo-500/30 py-2 rounded font-bold text-xs transition-colors">
                                    CONFIRM ADJUSTMENT
                                </button>
                             </form>

                             <div className="mt-4 flex gap-4 text-xs">
                                 <div className="bg-slate-900 px-3 py-2 rounded border border-slate-700">
                                     <span className="text-slate-500 block">Current AL Net Adj.</span>
                                     <span className={`font-mono font-bold ${(getEditingUser()?.leaveAdjustments?.annualLeaveAdjustment || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                         {getEditingUser()?.leaveAdjustments?.annualLeaveAdjustment || 0}
                                     </span>
                                 </div>
                                 <div className="bg-slate-900 px-3 py-2 rounded border border-slate-700">
                                     <span className="text-slate-500 block">Current Repl. Balance</span>
                                     <span className="font-mono font-bold text-amber-400">
                                         {getEditingUser()?.leaveAdjustments?.replacementLeaveBalance || 0}
                                     </span>
                                 </div>
                             </div>
                        </div>

                        {/* Right: History Log */}
                        <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col h-64">
                             <div className="bg-slate-900 p-2 text-xs font-bold text-slate-400 border-b border-slate-800">
                                 Audit Logs
                             </div>
                             <div className="overflow-y-auto p-2 space-y-2 flex-1">
                                 {getEditingUser()?.adjustmentLogs?.length === 0 && <p className="text-slate-600 text-xs text-center mt-10">No history found.</p>}
                                 {getEditingUser()?.adjustmentLogs?.map((log) => (
                                     <div key={log.id} className="text-xs p-2 bg-slate-900/50 rounded border border-slate-800">
                                         <div className="flex justify-between text-slate-300">
                                             <span className="font-bold">{log.type}</span>
                                             <span className={log.amount >= 0 ? 'text-green-400' : 'text-red-400'}>{log.amount > 0 ? '+' : ''}{log.amount}</span>
                                         </div>
                                         <div className="text-slate-500 mt-1">{log.reason}</div>
                                         <div className="text-[10px] text-slate-600 mt-1 flex justify-between">
                                             <span>By: {log.adminName}</span>
                                             <span>{new Date(log.date).toLocaleDateString()}</span>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.map(emp => (
              <div key={emp.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 relative group overflow-hidden hover:border-indigo-500/30 transition-colors">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-bold text-white flex items-center gap-2">
                            {emp.fullName}
                            {emp.role === UserRole.ADMIN && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded border border-indigo-500/30">ADMIN</span>}
                        </h4>
                        <p className="text-xs text-slate-500">{emp.position}</p>
                    </div>
                    <div className="flex gap-1">
                         <button onClick={() => handleEditClick(emp)} className="p-2 text-slate-400 hover:bg-slate-700 rounded-full transition-all" title="Edit & Manage Balance"><Edit2 size={16} /></button>
                         {emp.role !== UserRole.ADMIN && <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-full transition-all" title="Delete"><Trash2 size={16} /></button>}
                    </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-700/50 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Key size={12} className="text-indigo-400"/>
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-indigo-200">{emp.username}</span>
                        <span className="text-slate-600">|</span>
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-indigo-200">{emp.password}</span>
                    </div>
                    {emp.role === UserRole.STAFF && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-slate-900 p-2 rounded text-xs">
                                <div className="text-slate-500 text-[10px]">Adjusted AL</div>
                                <div className={`${(emp.leaveAdjustments?.annualLeaveAdjustment || 0) > 0 ? 'text-green-400' : 'text-slate-300'}`}>
                                    {emp.leaveAdjustments?.annualLeaveAdjustment && emp.leaveAdjustments.annualLeaveAdjustment > 0 ? '+' : ''}
                                    {emp.leaveAdjustments?.annualLeaveAdjustment || 0}
                                </div>
                            </div>
                            <div className="bg-slate-900 p-2 rounded text-xs">
                                <div className="text-slate-500 text-[10px]">Repl. Balance</div>
                                <div className="text-amber-300">{emp.leaveAdjustments?.replacementLeaveBalance || 0} days</div>
                            </div>
                        </div>
                    )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REPORTS */}
      {view === 'reports' && (
          <div className="space-y-6">
              <div className="mb-2">
                  <h1 className="text-2xl font-bold text-white">Reports & Export</h1>
                  <p className="text-slate-400 text-sm">Generate and download CSV reports for Excel.</p>
              </div>

              <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-2xl">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                      <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-lg flex items-center justify-center">
                          <FileSpreadsheet size={24} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-white">Data Exporter</h3>
                          <p className="text-slate-400 text-sm">Select parameters to download raw data.</p>
                      </div>
                  </div>

                  <div className="space-y-6">
                      {/* Report Type */}
                      <div className="grid grid-cols-2 gap-4">
                          <button 
                             onClick={() => setReportType('ATTENDANCE')}
                             className={`p-4 rounded-lg border text-left transition-all ${reportType === 'ATTENDANCE' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                          >
                              <div className="font-bold mb-1">Attendance Log</div>
                              <div className="text-xs opacity-70">Check-in/out times, locations.</div>
                          </button>
                          <button 
                             onClick={() => setReportType('LEAVES')}
                             className={`p-4 rounded-lg border text-left transition-all ${reportType === 'LEAVES' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                          >
                              <div className="font-bold mb-1">Leave Requests</div>
                              <div className="text-xs opacity-70">Status, reasons, types.</div>
                          </button>
                      </div>

                      {/* Period Selection */}
                      <div>
                          <label className="text-sm font-medium text-slate-400 mb-2 block">Report Period</label>
                          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 mb-4">
                              <button onClick={() => setReportPeriod('MONTHLY')} className={`flex-1 py-2 text-sm font-bold rounded ${reportPeriod === 'MONTHLY' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Monthly</button>
                              <button onClick={() => setReportPeriod('YEARLY')} className={`flex-1 py-2 text-sm font-bold rounded ${reportPeriod === 'YEARLY' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Yearly</button>
                          </div>
                          
                          {reportPeriod === 'MONTHLY' ? (
                              <input 
                                type="month" 
                                value={reportDate} 
                                onChange={(e) => setReportDate(e.target.value)} 
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500 transition-colors"
                              />
                          ) : (
                              <select 
                                value={reportYear} 
                                onChange={(e) => setReportYear(Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-indigo-500 transition-colors"
                              >
                                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - i).map(y => (
                                      <option key={y} value={y}>{y}</option>
                                  ))}
                              </select>
                          )}
                      </div>

                      <button 
                        onClick={handleExport}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all"
                      >
                          <Download size={20} /> Download CSV Report
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* POLICY */}
      {view === 'policy' && (
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="text-indigo-400" />
                  Jenco HR Policies & Public Holidays
              </h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                  {/* Annual Leave Policy */}
                  <div className="space-y-4">
                      <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Annual Leave Entitlement</h3>
                      <div className="space-y-2 text-sm text-slate-400">
                          <div className="flex justify-between p-2 bg-slate-900 rounded">
                              <span>Less than 3 years</span>
                              <span className="text-white font-bold">12 Days</span>
                          </div>
                          <div className="flex justify-between p-2 bg-slate-900 rounded">
                              <span>3 years - 5 years</span>
                              <span className="text-white font-bold">14 Days</span>
                          </div>
                          <div className="flex justify-between p-2 bg-slate-900 rounded">
                              <span>5 years - 10 years</span>
                              <span className="text-white font-bold">16 Days</span>
                          </div>
                          <div className="flex justify-between p-2 bg-slate-900 rounded">
                              <span>10 years and above</span>
                              <span className="text-white font-bold">18 Days</span>
                          </div>
                      </div>
                  </div>

                  {/* Public Holidays List */}
                  <div className="space-y-4">
                      <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">Gazetted Public Holidays (13 Days)</h3>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                          {PUBLIC_HOLIDAYS.map((h, i) => (
                              <div key={i} className="flex justify-between items-center p-2 hover:bg-slate-700/50 rounded transition-colors">
                                  <span className="text-slate-300 flex items-center gap-2">
                                      <span className="text-xs text-slate-500 w-5">{i+1}.</span> 
                                      {h.name}
                                  </span>
                                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{h.date}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};