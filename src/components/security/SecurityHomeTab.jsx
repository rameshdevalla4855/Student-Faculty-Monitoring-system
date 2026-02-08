import React, { useState, useEffect } from 'react';
import { Shield, Users, AlertTriangle, Activity, ArrowRight } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

export default function SecurityHomeTab({ onNavigate }) {
    const [stats, setStats] = useState({
        scannedToday: 0,
        alertsToday: 0,
        activeGuards: 1
    });

    useEffect(() => {
        const fetchCounts = async () => {
            // Use en-CA for YYYY-MM-DD format to match dbUtils
            const todayString = new Date().toLocaleDateString('en-CA');

            try {
                // 1. Scans Today - Query by 'date' string field for exact match
                const qScans = query(
                    collection(db, "attendanceLogs"), // Note: Collection name in dbUtils is "attendanceLogs" not "attendance_logs"? 
                    // Let me double check dbUtils.js... 
                    // dbUtils line 7: collection(db, "attendanceLogs"); 
                    // WAIT. My previous code used "attendance_logs". This was the bug!
                    where("date", "==", todayString)
                );

                // 2. Alerts Today
                const qAlerts = query(
                    collection(db, "securityAlerts"), // dbUtils line 123: "securityAlerts"
                    where("date", "==", todayString)
                );

                // Use simple getDocs for counts
                const [scansSnap, alertsSnap] = await Promise.all([
                    getDocs(qScans),
                    getDocs(qAlerts)
                ]);

                setStats(prev => ({
                    ...prev,
                    scannedToday: scansSnap.size,
                    alertsToday: alertsSnap.size
                }));
            } catch (err) {
                console.error("Error fetching stats:", err);
            }
        };

        fetchCounts();

        // Listen to updates - optional, but maybe better to just use intervals for counts
        const interval = setInterval(fetchCounts, 60000); // 1 min refresh

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-50 flex flex-col items-center">
            <div className="max-w-5xl w-full space-y-12">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Security Command Center</h1>
                        <p className="text-slate-500 font-medium mt-1"> Daily Operations Overview</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            SYSTEM GEN 1.0 ACTIVE
                        </span>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Stat Card 1 */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-indigo-300 transition-colors cursor-pointer" onClick={() => onNavigate('logs')}>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Scans Today</p>
                            <h3 className="text-4xl font-black text-slate-900">{stats.scannedToday}</h3>
                        </div>
                        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Activity size={32} />
                        </div>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between group hover:border-red-300 transition-colors cursor-pointer" onClick={() => onNavigate('alerts')}>
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Security Alerts</p>
                            <h3 className="text-4xl font-black text-slate-900">{stats.alertsToday}</h3>
                        </div>
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <AlertTriangle size={32} />
                        </div>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex items-center justify-between">
                        <div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Active Guards</p>
                            <h3 className="text-4xl font-black text-slate-900">{stats.activeGuards}</h3>
                        </div>
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                            <Shield size={32} />
                        </div>
                    </div>
                </div>

                {/* Hero Action - Centered */}
                <div className="flex justify-center mt-12 mb-12">
                    <div className="w-full max-w-2xl bg-indigo-900 rounded-[2.5rem] p-12 text-white flex flex-col items-center text-center relative overflow-hidden group cursor-pointer shadow-2xl shadow-indigo-900/30 hover:scale-[1.02] transition-all duration-300" onClick={() => onNavigate('scan')}>

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/15 transition-all"></div>
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 shadow-inner border border-white/10">
                                <Shield className="text-white" size={40} />
                            </div>

                            <h2 className="text-4xl font-black mb-4 tracking-tight">Ready to Scan?</h2>
                            <p className="text-indigo-200 text-lg max-w-md mx-auto mb-10 leading-relaxed">
                                Launch the high-speed QR Scanner interface to process student and faculty entry/exit efficiently.
                            </p>

                            <button className="flex items-center gap-3 px-8 py-4 bg-white text-indigo-900 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:bg-indigo-50 transition-all">
                                <span>Launch Scanner</span>
                                <ArrowRight size={24} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
