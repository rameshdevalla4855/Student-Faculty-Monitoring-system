import React, { useState, useEffect } from 'react';
import AttendanceStats from '../AttendanceStats';
import { Activity, Clock, ArrowUpRight, ArrowDownRight, User, Users } from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, LineChart, Line
} from 'recharts';

// Helper: Normalize Department Names for consistently matching
const normalizeDept = (dept) => {
    if (!dept) return '';
    const d = dept.toUpperCase().replace(/[^A-Z]/g, ''); // Remove special chars
    if (['AID', 'CSM', 'AIDS', 'AI&DS'].includes(d) || d.includes('ARTIFICIAL')) return 'AIDS';
    if (['CSE', 'CS'].includes(d) || d.includes('COMPUTER')) return 'CSE';
    return d;
};

export default function HomeTab({ profile }) {
    // Chart State
    const [trendData, setTrendData] = useState([]);
    const [loadingChart, setLoadingChart] = useState(true);

    // Visualization Controls
    const [timeRange, setTimeRange] = useState('weekly'); // 'weekly' | 'daily'
    const [chartType, setChartType] = useState('bar'); // 'bar' | 'area' | 'line'

    // Live Feed State
    const [liveLogs, setLiveLogs] = useState([]);
    const [feedTab, setFeedTab] = useState('entry'); // 'entry' | 'exit'
    const [loadingFeed, setLoadingFeed] = useState(true);

    // 1. Fetch Weekly Trends
    useEffect(() => {
        const fetchTrends = async () => {
            if (!profile) return; // Wait for profile

            try {
                const today = new Date();
                const pastSevenDays = [];
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(today);
                    d.setDate(today.getDate() - i);
                    pastSevenDays.push(d.toLocaleDateString('en-CA'));
                }

                // Ideally one query with range, but client-side processing fine for Prototype
                const startDate = pastSevenDays[0];
                const q = query(collection(db, "attendanceLogs"), where("date", ">=", startDate));
                const querySnapshot = await getDocs(q);

                // Group by date
                const grouping = {};
                pastSevenDays.forEach(date => {
                    grouping[date] = { date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }), Students: 0, Faculty: 0, uniqueS: new Set(), uniqueF: new Set() };
                });

                querySnapshot.docs.forEach(doc => {
                    const data = doc.data();

                    // FILTER BY DEPARTMENT (Normalized)
                    if (profile.dept && normalizeDept(data.dept) !== normalizeDept(profile.dept)) {
                        return; // Skip if dept doesn't match
                    }

                    const dateKey = data.date;
                    if (grouping[dateKey]) {
                        if (data.role === 'faculty') {
                            grouping[dateKey].uniqueF.add(data.uid);
                        } else {
                            grouping[dateKey].uniqueS.add(data.uid);
                        }
                    }
                });

                // Convert to array
                const chartData = Object.values(grouping).map(grp => ({
                    name: grp.date,
                    Students: grp.uniqueS.size,
                    Faculty: grp.uniqueF.size
                }));

                setTrendData(chartData);
                setLoadingChart(false);

            } catch (err) {
                console.error("Trend Query Error:", err);
                setLoadingChart(false);
            }
        };
        fetchTrends();
    }, [profile]);

    // 2. Fetch Live Live Feed
    useEffect(() => {
        if (!profile) return; // Wait for profile

        const todayStr = new Date().toLocaleDateString('en-CA');
        const q = query(
            collection(db, "attendanceLogs"),
            where("date", "==", todayStr)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logs = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(log => !profile.dept || normalizeDept(log.dept) === normalizeDept(profile.dept)); // Client-side Dept Filter

            // Client-side Sort & Limit
            logs.sort((a, b) => {
                const tA = a.timestamp?.toMillis() || 0;
                const tB = b.timestamp?.toMillis() || 0;
                return tB - tA; // Descending
            });

            setLiveLogs(logs); // store all for daily calc
            setLoadingFeed(false);
        }, (error) => {
            console.error("Live Feed Error:", error);
            setLoadingFeed(false);
        });

        return () => unsubscribe();
    }, [profile]);

    // Helper: Process Daily Hourly Trend
    const getDailyData = () => {
        const hourly = {};
        // Initialize typical college hours (8 AM to 6 PM)
        for (let i = 8; i <= 18; i++) {
            const hourLabel = i > 12 ? `${i - 12} PM` : (i === 12 ? '12 PM' : `${i} AM`);
            hourly[i] = { name: hourLabel, Students: 0, Faculty: 0, sort: i };
        }

        liveLogs.forEach(log => {
            if (log.type === 'ENTRY' && log.timestamp) {
                const date = log.timestamp.toDate();
                const hour = date.getHours();
                if (hour >= 8 && hour <= 18) {
                    if (log.role === 'faculty') hourly[hour].Faculty++;
                    else hourly[hour].Students++;
                }
            }
        });

        return Object.values(hourly).sort((a, b) => a.sort - b.sort);
    };

    const currentChartData = timeRange === 'weekly' ? trendData : getDailyData();

    // Filter Logic for Feed
    const displayedLogs = liveLogs.slice(0, 50).filter(log =>
        feedTab === 'entry' ? log.type === 'ENTRY' : log.type === 'EXIT'
    );

    const renderChart = () => {
        const commonProps = { data: currentChartData, margin: { top: 20, right: 30, left: 0, bottom: 5 } };

        if (chartType === 'area') {
            return (
                <AreaChart {...commonProps}>
                    <defs>
                        <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorFaculty" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#9333ea" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="Students" stroke="#4f46e5" fillOpacity={1} fill="url(#colorStudents)" />
                    <Area type="monotone" dataKey="Faculty" stroke="#9333ea" fillOpacity={1} fill="url(#colorFaculty)" />
                </AreaChart>
            );
        }

        if (chartType === 'line') {
            return (
                <LineChart {...commonProps}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Line type="monotone" dataKey="Students" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Faculty" stroke="#9333ea" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
            );
        }

        // Default Bar
        return (
            <BarChart {...commonProps}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="Students" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                <Bar dataKey="Faculty" fill="#9333ea" radius={[4, 4, 0, 0]} barSize={32} />
            </BarChart>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. Quick Stats Overview */}
            <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Activity className="text-indigo-600" /> Live Overview
                </h2>
                <AttendanceStats />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 2. Attendance Trends Chart Area */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col h-[28rem]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <h3 className="font-bold text-gray-800">Attendance Trends</h3>

                        <div className="flex items-center gap-3">
                            {/* Time Toggle */}
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => { setTimeRange('weekly'); setChartType('bar'); }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === 'weekly' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Weekly
                                </button>
                                <button
                                    onClick={() => { setTimeRange('daily'); setChartType('area'); }}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${timeRange === 'daily' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Daily
                                </button>
                            </div>

                            {/* Type Toggle */}
                            <select
                                value={chartType}
                                onChange={(e) => setChartType(e.target.value)}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold bg-white text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="bar">Bar Chart</option>
                                <option value="area">Area Chart</option>
                                <option value="line">Line Chart</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 w-full min-h-0">
                        {loadingChart ? (
                            <div className="h-full flex items-center justify-center text-gray-400">Loading Chart...</div>
                        ) : currentChartData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                {renderChart()}
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* 3. Live Activity Feed */}
                <div className="bg-white p-0 rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[28rem]">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Clock size={16} className="text-gray-500" /> Live Feed
                        </h3>
                        {/* Tabs */}
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                            <button
                                onClick={() => setFeedTab('entry')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${feedTab === 'entry' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Entered
                            </button>
                            <button
                                onClick={() => setFeedTab('exit')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${feedTab === 'exit' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Exited/Bunked
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-0">
                        {loadingFeed ? (
                            <p className="text-center text-gray-400 py-8">Syncing...</p>
                        ) : displayedLogs.length === 0 ? (
                            <div className="text-center py-12 opacity-50">
                                <p className="text-gray-500">No logs in this category today.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {displayedLogs.map((log) => (
                                    <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                        <div className="flex gap-3 items-center">
                                            <div className={`p-2 rounded-full ${log.type === 'ENTRY' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {log.type === 'ENTRY' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900 leading-tight">{log.name}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 rounded border border-gray-200">
                                                        {log.rollNumber && log.rollNumber !== 'N/A' ? log.rollNumber : 'ID: ' + log.uid.slice(0, 6)}
                                                    </span>
                                                    {(log.year && log.year !== 'N/A') && (
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                            Yr {log.year}
                                                        </span>
                                                    )}
                                                    {(log.dept && log.dept !== 'N/A') && (
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                            • {log.dept}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-gray-400 block">
                                                {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                                            </span>
                                            <span className={`text-[10px] uppercase font-bold tracking-wider ${log.type === 'ENTRY' ? 'text-green-600' : 'text-orange-500'}`}>
                                                {log.type === 'ENTRY' ? 'Checked In' : 'Checked Out'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
