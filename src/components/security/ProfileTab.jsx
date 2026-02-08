import React from 'react';
import { Shield, User, LogOut, MapPin } from 'lucide-react';

export default function ProfileTab({ currentUser, logout }) {

    return (
        <div className="p-6 bg-slate-50 h-full flex flex-col">
            <div className="flex flex-col items-center py-8">
                <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600 shadow-inner">
                    <Shield size={48} />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Security Officer</h2>
                <p className="text-gray-500">{currentUser?.email}</p>
            </div>

            <div className="space-y-4 flex-1">
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
                    <MapPin className="text-gray-400" />
                    <div>
                        <p className="text-sm text-gray-500">Assignment</p>
                        <p className="font-semibold text-gray-900">Main Gate (Gate 1)</p>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4">
                    <User className="text-gray-400" />
                    <div>
                        <p className="text-sm text-gray-500">Employee ID</p>
                        <p className="font-semibold text-gray-900">{currentUser?.uid?.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>
            </div>

            <button
                onClick={logout}
                className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
            >
                <LogOut size={20} /> Sign Out
            </button>
        </div>
    );
}
