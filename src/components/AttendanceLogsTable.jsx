import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { Download, Search, Filter } from 'lucide-react';

export default function AttendanceLogsTable() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ dept: '', year: '' });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Apply Filters (Firestore specific)
        const constraints = [];
        if (filters.dept) constraints.push(where("dept", "==", filters.dept));
        if (filters.year) constraints.push(where("year", "==", filters.year));

        let q = query(
            collection(db, "attendanceLogs"),
            orderBy("timestamp", "desc"),
            limit(50),
            ...constraints
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                time: doc.data().timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'N/A',
                dateString: doc.data().timestamp?.toDate().toLocaleDateString() || 'N/A'
            }));
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching logs: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [filters]);

    // Client-side search as Firestore requires full text index (Algolia/Typesense) for robust string search
    const filteredLogs = logs.filter(log =>
        log.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.uid?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const exportCSV = () => {
        const headers = ["Name", "ID", "Dept", "Date", "Time", "Type"];
        const csvContent = [
            headers.join(","),
            ...filteredLogs.map(log =>
                `"${log.name}","${log.uid}","${log.dept}","${log.dateString}","${log.time}","${log.type}"`
            )
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `attendance_logs_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading live data...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search student..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                        <Filter size={14} className="text-gray-500" />
                        <select
                            className="bg-transparent text-sm text-gray-600 focus:outline-none"
                            value={filters.dept}
                            onChange={(e) => setFilters(prev => ({ ...prev, dept: e.target.value }))}
                        >
                            <option value="">All Depts</option>
                            <option value="CSE">CSE</option>
                            <option value="ECE">ECE</option>
                            <option value="MECH">MECH</option>
                        </select>
                    </div>

                    <button
                        onClick={exportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Download size={16} />
                        Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                        <tr>
                            <th className="py-3 px-6">Timestamp</th>
                            <th className="py-3 px-6">Student Details</th>
                            <th className="py-3 px-6">Department</th>
                            <th className="py-3 px-6">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-gray-400 italic">No logs found matching filters</td>
                            </tr>
                        ) : (
                            filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-3 px-6 text-gray-800">
                                        <div className="font-semibold">{log.time}</div>
                                        <div className="text-xs text-gray-400">{log.dateString}</div>
                                    </td>
                                    <td className="py-3 px-6">
                                        <div className="font-medium text-gray-900">{log.name || 'Unknown'}</div>
                                        <div className="text-xs text-gray-400 font-mono bg-gray-100 inline-block px-1 rounded mt-0.5">{log.uid}</div>
                                    </td>
                                    <td className="py-3 px-6">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                                            {log.dept} {log.year ? `- Year ${log.year}` : ''}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${log.type === 'ENTRY' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${log.type === 'ENTRY' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                                            {log.type}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            <div className="py-3 px-6 bg-gray-50 border-t border-gray-100 text-right text-xs text-gray-400">
                Showing recent 50 transactions
            </div>
        </div>
    );
}
