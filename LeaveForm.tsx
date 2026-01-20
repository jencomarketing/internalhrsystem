import React, { useState, useEffect } from 'react';
import { User, LeaveType, LeaveStatus, LeaveRequest, Entitlement, LeaveDuration, ReplacementClaim } from '../types';
import { storageService } from '../services/storage';
import { FileUp, Send, Smartphone, Mail, PlusCircle, CalendarPlus, AlertTriangle, Calendar } from 'lucide-react';

interface Props {
  user: User;
  onSuccess: () => void;
}

export const LeaveForm: React.FC<Props> = ({ user, onSuccess }) => {
  const [mode, setMode] = useState<'APPLY' | 'CLAIM'>('APPLY');
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  
  // Apply Leave State
  const [type, setType] = useState<LeaveType>(LeaveType.ANNUAL);
  const [duration, setDuration] = useState<LeaveDuration>(LeaveDuration.FULL);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [calculatedDays, setCalculatedDays] = useState<number>(0);

  // Claim Credit State
  const [claimWorkDate, setClaimWorkDate] = useState('');
  const [claimDuration, setClaimDuration] = useState<LeaveDuration>(LeaveDuration.FULL);
  const [claimReason, setClaimReason] = useState('');
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  useEffect(() => {
    setEntitlement(storageService.calculateEntitlement(user));
  }, [user]);

  // Effect: Birthday leave
  useEffect(() => {
    if (type === LeaveType.BIRTHDAY) {
        setDuration(LeaveDuration.HALF_AM);
    }
  }, [type]);

  // Effect: Calculate Days Explicitly
  useEffect(() => {
    if (duration !== LeaveDuration.FULL) {
        setCalculatedDays(0.5);
        return;
    }
    if (startDate && endDate) {
        const days = storageService.calculateWorkingDays(startDate, endDate);
        setCalculatedDays(days);
    } else if (startDate) {
        setCalculatedDays(1);
    } else {
        setCalculatedDays(0);
    }
  }, [startDate, endDate, duration]);

  const needsFile = type === LeaveType.SICK || type === LeaveType.HOSPITALIZATION;

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // 1. Basic File Validation
    if (needsFile && !file) {
      setValidationError("Medical Certificate (MC) photo is required for Sick/Hospitalization leave.");
      return;
    }
    if (type === LeaveType.BIRTHDAY && duration === LeaveDuration.FULL) {
        setValidationError("Birthday leave is only applicable for Half Day.");
        return;
    }

    const finalEndDate = (duration !== LeaveDuration.FULL) ? startDate : endDate;

    // 2. Advance Notice Validation (7 Days)
    // Applies to Annual, Replacement, No Pay, Birthday. Excludes Emergency/Sick.
    const isUnplanned = [LeaveType.SICK, LeaveType.HOSPITALIZATION, LeaveType.EMERGENCY].includes(type);
    
    if (!isUnplanned) {
        const today = new Date();
        // Reset time to midnight for accurate day comparison
        today.setHours(0,0,0,0);
        const start = new Date(startDate);
        start.setHours(0,0,0,0);
        
        const diffTime = start.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 7) {
            setValidationError(`Policy Violation: ${type} must be applied at least 7 days in advance.`);
            return;
        }
    }

    // 3. Duration Limit Validation (Max 5 Working Days)
    if (duration === LeaveDuration.FULL && startDate && finalEndDate) {
        const workingDays = storageService.calculateWorkingDays(startDate, finalEndDate);
        if (workingDays > 5) {
            setValidationError("Policy Violation: You can only apply for a maximum of 5 working days per application.");
            return;
        }
    }

    const newRequest: LeaveRequest = {
      id: Date.now().toString(),
      userId: user.id,
      userName: user.fullName,
      type,
      duration,
      startDate,
      endDate: finalEndDate,
      reason,
      status: LeaveStatus.PENDING,
      appliedAt: new Date().toISOString(),
      attachmentUrl: file ? URL.createObjectURL(file) : undefined
    };

    await storageService.applyLeave(newRequest);
    setSubmittedId(newRequest.id);
    onSuccess();
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newClaim: ReplacementClaim = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.fullName,
        workDate: claimWorkDate,
        duration: claimDuration,
        description: claimReason,
        status: LeaveStatus.PENDING,
        appliedAt: new Date().toISOString()
    };
    await storageService.applyClaim(newClaim);
    setClaimSubmitted(true);
    onSuccess();
  };

  const getNotificationDetails = () => {
    const text = `${user.fullName} applied for ${type} from ${startDate} to ${endDate || startDate}. Reason: ${reason}.`;
    const encodedText = encodeURIComponent(text);
    
    return {
        wa1: `https://wa.me/60126539881?text=${encodedText}`,
        wa2: `https://wa.me/60173309940?text=${encodedText}`,
        email: `mailto:baogaliao.marketing@gmail.com?subject=Leave Application - ${user.fullName}&body=${encodedText}`
    };
  };

  if (!entitlement) return <div>Loading...</div>;

  const balanceAL = entitlement.annualTotal - entitlement.annualUsed;
  const balanceRL = entitlement.replacementTotal - entitlement.replacementUsed;

  // --- Success Views ---
  if (submittedId) {
    const links = getNotificationDetails();
    return (
      <div className="bg-slate-800/50 border border-green-500/30 p-8 rounded-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send size={32} />
        </div>
        <h3 className="text-2xl font-bold text-white">Application Submitted!</h3>
        <p className="text-slate-400">System requirement: Please notify management immediately.</p>
        
        <div className="flex flex-col gap-3 max-w-sm mx-auto mt-6">
          <a href={links.wa1} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-lg transition-colors">
              <Smartphone size={20} /> WhatsApp Manager 1
          </a>
          <a href={links.wa2} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-lg transition-colors">
              <Smartphone size={20} /> WhatsApp Manager 2
          </a>
          <a href={links.email} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors">
              <Mail size={20} /> Send Email Notification
          </a>
        </div>
        
        <button onClick={() => { setSubmittedId(null); setValidationError(null); }} className="text-slate-500 text-sm mt-4 underline">Submit another</button>
      </div>
    );
  }

  if (claimSubmitted) {
    return (
      <div className="bg-slate-800/50 border border-amber-500/30 p-8 rounded-2xl text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
          <CalendarPlus size={32} />
        </div>
        <h3 className="text-2xl font-bold text-white">Claim Submitted!</h3>
        <p className="text-slate-400">Your Replacement Credit will be added to your balance once Admin approves.</p>
        <button onClick={() => setClaimSubmitted(false)} className="px-6 py-2 bg-slate-700 text-white rounded-lg mt-4">Back</button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Entitlement Summary Side */}
      <div className="md:col-span-1 space-y-4">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h4 className="text-slate-400 text-sm font-medium">Annual Leave</h4>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{balanceAL}</span>
            <span className="text-sm text-slate-500">/ {entitlement.annualTotal}</span>
          </div>
        </div>
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
          <h4 className="text-slate-400 text-sm font-medium">Replacement Credit</h4>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-indigo-400">{balanceRL}</span>
            <span className="text-sm text-slate-500">/ {entitlement.replacementTotal}</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Earn more by submitting a claim.</p>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="md:col-span-2 bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700">
        
        {/* Toggle Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-slate-700 pb-2">
            <button 
                onClick={() => setMode('APPLY')} 
                className={`pb-2 px-1 font-bold transition-colors ${mode === 'APPLY' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Apply for Leave
            </button>
            <button 
                onClick={() => setMode('CLAIM')} 
                className={`pb-2 px-1 font-bold transition-colors ${mode === 'CLAIM' ? 'text-amber-400 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'}`}
            >
                Claim Replacement Credit
            </button>
        </div>

        {mode === 'APPLY' ? (
            <form onSubmit={handleApplySubmit} className="space-y-4">
              {validationError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-3 text-rose-300 text-sm">
                      <AlertTriangle className="shrink-0 mt-0.5" size={16} />
                      <span>{validationError}</span>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Leave Type</label>
                    <select 
                      value={type} 
                      onChange={(e) => { setType(e.target.value as LeaveType); setValidationError(null); }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none"
                    >
                      {Object.values(LeaveType).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Duration</label>
                    <select 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value as LeaveDuration)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none"
                    >
                      {Object.values(LeaveDuration).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Start Date</label>
                  <input 
                    type="date" 
                    required
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setValidationError(null); }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" 
                  />
                </div>
                <div className={duration !== LeaveDuration.FULL ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-sm font-medium text-slate-400 mb-1">End Date</label>
                  <input 
                    type="date" 
                    required={duration === LeaveDuration.FULL}
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setValidationError(null); }}
                    disabled={duration !== LeaveDuration.FULL}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" 
                  />
                </div>
              </div>

              {/* Explicit Day Calculation Display */}
              <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-lg p-3 flex items-center justify-between">
                   <div className="flex items-center gap-2 text-indigo-300">
                        <Calendar size={18} />
                        <span className="text-sm font-medium">Duration:</span>
                   </div>
                   <div className="text-indigo-100 font-bold">
                       {calculatedDays > 0 ? `${calculatedDays} Day${calculatedDays !== 1 ? 's' : ''}` : '-'}
                   </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Reason</label>
                <textarea 
                  required
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Detailed reason..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none resize-none"
                ></textarea>
              </div>

              {needsFile && (
                <div className="p-4 border border-dashed border-slate-600 rounded-lg bg-slate-800/50">
                  <label className="flex flex-col items-center cursor-pointer">
                    <FileUp className="text-slate-400 mb-2" />
                    <span className="text-sm text-slate-300 font-medium">Upload MC Photo</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                  {file && <p className="text-center text-sm text-indigo-400 mt-2">{file.name}</p>}
                </div>
              )}

              <div className="pt-2">
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg">
                  Submit Application ({calculatedDays} Days)
                </button>
              </div>
            </form>
        ) : (
            <form onSubmit={handleClaimSubmit} className="space-y-4">
                <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20 mb-4">
                    <p className="text-amber-300 text-sm">Use this form to claim "Replacement Credits" for work done on weekends or public holidays. Once approved, your Replacement Leave balance will increase.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Work Date (Extra)</label>
                        <input 
                            type="date" 
                            required
                            value={claimWorkDate}
                            onChange={(e) => setClaimWorkDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Credits Claimed</label>
                        <select 
                          value={claimDuration} 
                          onChange={(e) => setClaimDuration(e.target.value as LeaveDuration)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none"
                        >
                          <option value={LeaveDuration.FULL}>1 Full Day</option>
                          <option value={LeaveDuration.HALF_AM}>0.5 Day</option>
                        </select>
                     </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Description of Work</label>
                    <textarea 
                      required
                      rows={3}
                      value={claimReason}
                      onChange={(e) => setClaimReason(e.target.value)}
                      placeholder="e.g. Supported client event at KLCC..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white outline-none resize-none"
                    ></textarea>
                </div>
                <div className="pt-2">
                    <button type="submit" className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg">
                      Submit Claim
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};