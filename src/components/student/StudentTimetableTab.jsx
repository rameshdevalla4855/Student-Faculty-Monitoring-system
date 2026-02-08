import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Coffee, BookOpen, ChevronRight, User } from 'lucide-react';

export default function StudentTimetableTab({ timetable }) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Auto-select today
    const [todayName, setTodayName] = useState('');
    const [selectedDay, setSelectedDay] = useState('Monday');

    useEffect(() => {
        const t = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        setTodayName(t);
        if (days.includes(t)) {
            setSelectedDay(t);
        }
    }, []);

    // Helper to sort slots
    const timeOrder = {
        '09:00 - 10:00': 1, '10:00 - 11:00': 2, '11:00 - 12:00': 3,
        '12:00 - 01:00': 4, '01:00 - 02:00': 5, '02:00 - 03:00': 6, '03:00 - 04:00': 7
    };

    const sortSlots = (slots) => {
        return [...slots].sort((a, b) => (timeOrder[a.time] || 99) - (timeOrder[b.time] || 99));
    };

    const slots = timetable[selectedDay] || [];

    // Helper to determine class status
    const getClassStatus = (timeRange) => {
        if (selectedDay !== todayName) return 'upcoming';

        const now = new Date();
        const currentHour = now.getHours();

        const [startStr] = timeRange.split(' - ');
        let startHour = parseInt(startStr.split(':')[0]);
        if (startHour < 8) startHour += 12; // PM adjustment logic
        if (startHour === 12 && startStr.includes('12:00')) startHour = 12;

        const endHour = startHour + 1;

        if (currentHour >= startHour && currentHour < endHour) return 'ongoing';
        if (currentHour >= endHour) return 'completed';
        return 'upcoming';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Weekly Schedule</h2>
                    <p className="text-gray-600 font-medium">{selectedDay}'s Classes</p>
                </div>

                {/* Clear, Buttons for Days */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {days.map(day => (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors whitespace-nowrap ${selectedDay === day
                                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-md'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                                }`}
                        >
                            {day.slice(0, 3)}
                        </button>
                    ))}
                </div>
            </div>

            {/* List View - Simple and Readable */}
            <div className="space-y-4">
                {slots.length > 0 ? (
                    sortSlots(slots).map((slot, idx) => {
                        const isBreak = slot.subjectCode === 'BREAK';
                        const [startTime, endTime] = slot.time.split(' - ');
                        const status = getClassStatus(slot.time);

                        // Explicit Colors for Logic
                        const statusColor = isBreak
                            ? 'bg-orange-50 border-orange-200'
                            : status === 'ongoing'
                                ? 'bg-white border-indigo-500 ring-2 ring-indigo-50 shadow-lg'
                                : 'bg-white border-gray-200 hover:border-indigo-300';

                        return (
                            <div key={idx} className={`rounded-xl border p-5 flex flex-col md:flex-row gap-4 md:items-center transition-all ${statusColor}`}>

                                {/* Time Block - Left */}
                                <div className="min-w-[100px] flex flex-row md:flex-col items-center md:items-start gap-3 md:gap-0 border-b md:border-b-0 md:border-r border-gray-100 md:pr-4 pb-3 md:pb-0">
                                    <div className={`p-2 rounded-lg ${status === 'ongoing' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                                        <Clock size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-lg text-gray-900">{startTime}</p>
                                        <p className="text-sm text-gray-500 font-medium">{endTime}</p>
                                    </div>
                                </div>

                                {/* Main Content */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 leading-snug">
                                                {slot.subjectName}
                                            </h3>
                                            {!isBreak && (
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-bold font-mono border border-gray-200">
                                                        {slot.subjectCode}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Simple Status Badges */}
                                        {status === 'ongoing' && !isBreak && (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200 animate-pulse">
                                                LIVE NOW
                                            </span>
                                        )}
                                        {status === 'completed' && !isBreak && (
                                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold border border-gray-200">
                                                DONE
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Instructor Block - Right */}
                                {!isBreak && (
                                    <div className="flex items-center gap-3 md:pl-4 md:border-l border-gray-100 min-w-[180px]">
                                        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                                            {slot.facultyName?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{slot.facultyName}</p>
                                            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Instructor</p>
                                        </div>
                                    </div>
                                )}

                                {isBreak && (
                                    <div className="md:ml-auto flex items-center gap-2 text-orange-600 font-bold bg-orange-100/50 px-4 py-2 rounded-lg">
                                        <Coffee size={18} />
                                        <span>Break Time</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="bg-white border rounded-xl p-10 text-center shadow-sm">
                        <div className="inline-block p-4 rounded-full bg-gray-100 mb-4">
                            <Calendar size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">No classes scheduled</h3>
                        <p className="text-gray-500 mt-2">Enjoy your free day!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
