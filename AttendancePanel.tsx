import React, { useState, useEffect } from 'react';
import { User, AttendanceRecord } from '../types';
import { storageService } from '../services/storage';
import { MapPin, Clock, AlertTriangle, CheckCircle, Hourglass } from 'lucide-react';

interface Props {
  user: User;
}

export const AttendancePanel: React.FC<Props> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadTodayAttendance();
    return () => clearInterval(timer);
  }, []);

  const loadTodayAttendance = () => {
    const records = storageService.getAttendance(user.id);
    const today = new Date().toISOString().split('T')[0];
    const found = records.find(r => r.date === today);
    setTodayRecord(found || null);
  };

  const handleCheckIn = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Simulated address
          const simulatedAddress = `Jalan Teknologi 5, Taman Sains Selangor, (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          
          await storageService.checkIn(user.id, simulatedAddress, { lat: latitude, lng: longitude });
          loadTodayAttendance();
        } catch (e) {
          setError("Failed to log attendance. Please try again.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(`Location access denied. Please enable GPS. (${err.message})`);
        setLoading(false);
      }
    );
  };

  const handleCheckOut = async () => {
    setLoading(true);
    await storageService.checkOut(user.id);
    loadTodayAttendance();
    setLoading(false);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Calculate target check out time (Check in + 9 hours)
  const getTargetCheckOut = (checkInStr: string) => {
      const d = new Date(checkInStr);
      d.setHours(d.getHours() + 9);
      return formatTime(d);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Attendance Tracker</h2>

      {/* Clock Card */}
      <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl border border-slate-700 text-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
        
        <div className="mb-2 text-slate-400 font-medium tracking-wide uppercase">Current Time</div>
        <div className="text-5xl md:text-7xl font-bold text-white font-mono tracking-tighter">
          {formatTime(currentTime)}
        </div>
        <div className="text-slate-400 mt-2">{currentTime.toDateString()}</div>

        <div className="mt-8 flex justify-center">
          {!todayRecord ? (
            <button
              onClick={handleCheckIn}
              disabled={loading}
              className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:shadow-[0_0_30px_rgba(79,70,229,0.7)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Locating...</span>
              ) : (
                <span className="flex items-center gap-2"><MapPin size={24} /> CHECK IN NOW</span>
              )}
            </button>
          ) : !todayRecord.checkOutTime ? (
            <div className="space-y-4 w-full">
               <div className="bg-slate-700/30 p-4 rounded-xl border border-slate-600/50 inline-block mb-2">
                 <div className="text-slate-400 text-xs uppercase font-bold mb-1">Target Check-out</div>
                 <div className="text-2xl font-bold text-white flex items-center gap-2 justify-center">
                    <Hourglass size={20} className="text-indigo-400"/>
                    {getTargetCheckOut(todayRecord.checkInTime)}
                 </div>
                 <p className="text-[10px] text-slate-500 mt-1">(9 Hours incl. 1hr Lunch)</p>
               </div>

               <div className="flex flex-col items-center space-y-2">
                 <p className="text-slate-400 text-sm max-w-xs mx-auto flex items-center justify-center gap-1">
                    <MapPin size={14} /> {todayRecord.location}
                 </p>
               </div>
               <button
                onClick={handleCheckOut}
                disabled={loading}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold transition-all shadow-lg"
              >
                CHECK OUT
              </button>
            </div>
          ) : (
            <div className="space-y-2">
                <div className="text-green-400 font-medium flex items-center justify-center gap-2 text-lg">
                  <CheckCircle /> You have completed work for today.
                </div>
                {todayRecord.status === 'Incomplete Hours' && (
                    <div className="text-amber-500 text-sm bg-amber-500/10 p-2 rounded border border-amber-500/20">
                        Notice: Less than 9 hours recorded.
                    </div>
                )}
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}
      </div>
    </div>
  );
};