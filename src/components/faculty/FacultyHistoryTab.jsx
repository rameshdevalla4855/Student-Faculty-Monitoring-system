import React from 'react';
import UserAttendanceHistory from '../UserAttendanceHistory';
import { History } from 'lucide-react';

export default function FacultyHistoryTab() {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <History className="text-purple-600" /> My Attendance Log
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
                <UserAttendanceHistory />
            </div>
        </div>
    );
}
