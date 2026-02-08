import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Briefcase, MapPin, Clock, Calendar, CheckCircle, AlertCircle, Users, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function FacultyHomeTab({ profile, status, schedule }) {
    const { currentUser } = useAuth();

    // Date & Time
    const todayDate = new Date();
    const dateString = todayDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
    const todayDay = todayDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Schedule Logic
    const todaysClasses = schedule[todayDay] || [];
    const nextClass = todaysClasses?.find(c => {
        if (!c?.startTime) return false;
        const [h, m] = c.startTime.split(':');
        const classTime = new Date();
        classTime.setHours(h, m, 0);
        return classTime > new Date();
    });

    const activeClass = todaysClasses?.find(c => {
        if (!c?.startTime || !c?.endTime) return false;
        const [sh, sm] = c.startTime.split(':');
        const [eh, em] = c.endTime.split(':');
        const start = new Date(); start.setHours(sh, sm, 0);
        const end = new Date(); end.setHours(eh, em, 0);
        const now = new Date();
        return now >= start && now <= end;
    });

    return (
        <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* 1. Welcome Header */}
            <div className="flex justify-between items-end px-1">
                <div>
                    <p className="text-gray-500 font-medium text-xs uppercase tracking-wider mb-1">{dateString}</p>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                        Welcome, <span className="text-purple-600">{profile?.name?.split(' ')[0] || 'Professor'}</span>
                    </h1>
                </div>
                <div className="hidden md:block">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${status === 'IN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${status === 'IN' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                        {status === 'IN' ? 'On Campus' : 'Off Campus'}
                    </span>
                </div>
            </div>

            {/* 2. Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* A. Identity Card - 2 Cols */}
                <div className="md:col-span-2 bg-gradient-to-br from-purple-800 via-purple-700 to-indigo-800 rounded-[2rem] p-6 md:p-8 text-white shadow-2xl shadow-purple-200 relative overflow-hidden group flex flex-row items-center justify-between">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-72 h-72 rounded-full bg-white/10 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>

                    {/* Left: Info */}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[140px] flex-1">
                        <div>
                            <span className="px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase border border-white/10 mb-2 inline-block">
                                Faculty Pass
                            </span>
                            <h2 className="text-2xl md:text-4xl font-bold tracking-tight mb-1">{profile?.name || 'Loading...'}</h2>
                            <p className="text-purple-100 font-medium text-sm opacity-90">{profile?.designation}</p>
                        </div>

                        <div className="flex flex-col gap-1 mt-4">
                            <span className="text-purple-200 text-xs font-medium uppercase tracking-wider">Department</span>
                            <span className="text-lg font-bold">{profile?.dept}</span>
                            <span className="font-mono text-sm tracking-wide opacity-80">{profile?.facultyId}</span>
                        </div>
                    </div>

                    {/* Right: QR Code (Always Visible) */}
                    <div className="relative z-10 bg-white p-2 rounded-xl shadow-lg shrink-0 ml-4">
                        <QRCodeCanvas value={currentUser?.uid || "N/A"} size={140} fgColor="#581c87" />
                    </div>
                </div>

                {/* B. Stats & Next Class */}
                <div className="space-y-4 md:space-y-0 md:grid md:grid-rows-2 md:gap-4 md:col-span-1">

                    {/* Next/Active Class */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 relative overflow-hidden flex flex-col justify-center">
                        {activeClass ? (
                            <>
                                <div className="absolute right-4 top-4 w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <p className="text-xs text-green-600 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Clock size={14} /> Live Session
                                </p>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">{activeClass.subject}</h3>
                                <p className="text-gray-500 text-sm mt-1">{activeClass.context}</p>
                            </>
                        ) : nextClass ? (
                            <>
                                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                    <Calendar size={14} /> Next Session
                                </p>
                                <h3 className="text-lg font-bold text-gray-900 leading-tight">{nextClass.subject}</h3>
                                <div className="flex justify-between items-end mt-2">
                                    <p className="text-gray-500 text-sm font-medium">{nextClass.startTime}</p>
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">{nextClass.context}</p>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center">
                                <CheckCircle className="text-gray-300 mb-2" size={24} />
                                <p className="text-sm font-bold text-gray-900">Day Complete</p>
                                <p className="text-xs text-gray-400">No more classes.</p>
                            </div>
                        )}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                            <span className="text-2xl font-bold text-purple-600">{todaysClasses.length}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Sessions</span>
                        </div>
                        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
                            <span className="text-lg font-bold text-gray-900">View</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 mt-1">Full Log</span>
                        </div>
                    </div>
                </div>

                {/* C. Teaching Timeline */}
                <div className="md:col-span-3 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-6">
                        <Users size={18} className="text-purple-600" /> Teaching Schedule
                    </h3>

                    <div className="space-y-4">
                        {todaysClasses.length > 0 ? todaysClasses.map((item, idx) => {
                            const isActive = activeClass === item;
                            return (
                                <div key={idx} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isActive ? 'bg-purple-50 border-purple-100 shadow-sm' : 'bg-gray-50 border-gray-100'
                                    }`}>
                                    <div className="w-16 text-center shrink-0">
                                        <p className="text-sm font-bold text-gray-900">{item.startTime}</p>
                                        <p className="text-[10px] text-gray-500">{item.endTime}</p>
                                    </div>
                                    <div className="w-px h-8 bg-gray-200 shrink-0"></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-sm text-gray-900">{item.subject}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">{item.context}</p>
                                    </div>
                                    {isActive && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full animate-pulse">LIVE</span>}
                                </div>
                            )
                        }) : (
                            <p className="text-center text-gray-400 text-sm py-8">No classes scheduled.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
