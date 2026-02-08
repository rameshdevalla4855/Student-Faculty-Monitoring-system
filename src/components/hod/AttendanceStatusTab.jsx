
import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { academicService } from '../../services/academicService'; // Import Service
import { Download, Filter, Search, UserCheck, UserX, Clock } from 'lucide-react';

// Helper: Normalize Department Names for HOD Scope (Broad)
// Helper: Normalize Department Names for HOD Scope (Broad)
// groups CSM/AID under AIDS for permission visibility
const getBroadDept = (dept) => {
    if (!dept) return '';
    const d = dept.toUpperCase().replace(/[^A-Z]/g, '');

    // AIDS Group (AIML, Data Science, IOT, etc.)
    if (['AID', 'CSM', 'AIDS', 'AI&DS', 'AIML', 'ML', 'DS', 'CSD', 'CS-DS', 'CS-AI', 'IOT', 'CS-IOT', 'CSIOT'].includes(d) ||
        d.includes('ARTIFICIAL') || d.includes('MACHINE') || d.includes('DATA') || d.includes('IOT')) return 'AIDS';

    // CSE Group
    if (['CSE', 'CS', 'CSBS', 'CSI', 'CSEA', 'CSEB'].includes(d) ||
        d.includes('COMPUTER') || d.includes('COMP')) return 'CSE';

    return d;
};

// Helper: Normalize Branch for Filtering (Strict)
// Distinguishes CSM from AID, but handles aliases (AIDS=AID)
// Helper: Normalize Branch for Filtering (Strict)
// Distinguishes CSM, IOT, AID from each other
const getStrictBranch = (branch) => {
    if (!branch) return '';
    const b = branch.toUpperCase().replace(/[^A-Z]/g, '');

    // Explicit Aliases
    if (['AID', 'AIDS', 'AI&DS'].includes(b)) return 'AID';
    if (['IOT', 'CSIOT', 'CS-IOT'].includes(b)) return 'IOT';
    if (['CSM', 'CS-ML', 'AIML'].includes(b)) return 'CSM'; // Assuming CSM covers AIML if not separate

    return b;
};

export default function AttendanceStatusTab({ profile }) {
    const [students, setStudents] = useState([]);
    const [attendanceMap, setAttendanceMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [structureBranches, setStructureBranches] = useState([]); // Dynamic Branches
    const [structureSections, setStructureSections] = useState([]); // Dynamic Sections

    // Filters
    const [filters, setFilters] = useState({
        dept: '', // Will update via useEffect when profile loads
        year: '',
        branch: '',
        section: '',
        search: ''
    });

    // 1. Fetch Structure & Set Base Filters
    useEffect(() => {
        const init = async () => {
            if (profile?.dept) {
                // Lock Dept Filter using Broad Scope
                setFilters(prev => ({ ...prev, dept: getBroadDept(profile.dept) }));

                // Fetch Dynamic Branches & Sections from Structure
                try {
                    const structure = await academicService.getStructure();
                    if (structure) {
                        // Branches
                        if (structure.branches) {
                            // Filter branches that belong to this HOD's department (Broad Scope)
                            const relevantBranches = structure.branches.filter(b =>
                                getBroadDept(b) === getBroadDept(profile.dept)
                            );
                            setStructureBranches(relevantBranches);
                        }
                        // Sections
                        if (structure.sections) {
                            setStructureSections(structure.sections);
                        }
                    }
                } catch (err) {
                    console.error("Error fetching structure:", err);
                }
            }
        };
        init();
    }, [profile]);

    // 2. Fetch Data & Calculate Status
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // A. Fetch Today's Attendance
                const today = new Date().toLocaleDateString('en-CA');
                const logsRef = collection(db, "attendanceLogs");
                const qLogs = query(logsRef, where("date", "==", today));
                const logsSnap = await getDocs(qLogs);

                const statusMap = {};
                logsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    const entry = {
                        status: data.type === 'ENTRY' ? 'INSIDE' : 'LEFT',
                        time: data.timestamp?.toDate ? data.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'
                    };
                    if (data.uid) statusMap[data.uid] = entry;
                    if (data.rollNumber) statusMap[data.rollNumber] = entry;
                    if (data.rollNo) statusMap[data.rollNo] = entry;
                });
                setAttendanceMap(statusMap);

                // B. Fetch Students
                // Strategy: Fetch ALL students if no specific other filters to allow flexible client-side dept matching
                // BUT extracting all students is heavy.
                // Optimization: If HOD is locked to 'AIDS', we can't just query 'dept'=='AIDS' because students are 'AID' or 'CSM'.
                // So we must fetch all students and filter client side OR use multiple queries.
                // For prototype scale (hundreds of students), fetching all students is okay.

                const studentsRef = collection(db, "students");
                const constraints = [];

                // Only apply strict DB filter if it's NOT a normalized complex dept like AIDS
                // Actually, let's rely on Client Side filtering for Dept to be safe with the AID/CSM issue.

                if (filters.year) {
                    const y = filters.year;
                    constraints.push(where("year", "in", [y, Number(y), y + "ST", y + "ND", y + "RD", y + "TH"]));
                }

                // NOTE: We do NOT strictly filter by "dept" (Branch) in DB here, 
                // because we need to handle "AID" vs "AIDS" and "1" vs "A" robustly on client side.
                // Since we rely on HOD Profile Dept filter logic, the dataset is already scoped reasonably.

                const qStudents = query(studentsRef, ...constraints);
                const studentSnap = await getDocs(qStudents);

                const studentList = studentSnap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })).filter(s => {
                    // 1. Dept Filter (Global HOD Scope - Broad)
                    // Ensure student belongs to the HOD's Major Dept (e.g. AID or CSM is allowed for HOD AIDS)
                    const activeDeptFilter = profile?.dept ? getBroadDept(profile.dept) : filters.dept;
                    if (activeDeptFilter && activeDeptFilter !== 'ALL DEPTS') {
                        if (getBroadDept(s.dept) !== activeDeptFilter) return false;
                    }

                    // 2. Branch Filter (Specific - Strict)
                    // If user selects "AID", we only show "AID" (mapped from AIDS/AID), NOT "CSM".
                    if (filters.branch) {
                        const sBranch = getStrictBranch(s.dept);
                        const fBranch = getStrictBranch(filters.branch);
                        if (sBranch !== fBranch) return false;
                    }

                    // 3. Section Filter
                    if (filters.section) {
                        // Loose comparison for "1" vs 1
                        if (String(s.section) !== String(filters.section)) return false;
                    }

                    return true;
                });

                setStudents(studentList);

            } catch (err) {
                console.error("Error fetching status data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [filters.dept, filters.year, filters.branch, filters.section, profile]);

    // Derived Data
    const getStatus = (uid) => {
        const log = attendanceMap[uid];
        if (!log) return 'ABSENT';
        return log.status;
    };

    const displayStudents = students.filter(s => {
        const query = filters.search.toLowerCase();
        return (
            s.name?.toLowerCase().includes(query) ||
            s.rollNumber?.toString().toLowerCase().includes(query) ||
            s.id?.toLowerCase().includes(query)
        );
    });

    const exportCSV = () => {
        const headers = ["Roll No", "Name", "Dept", "Year", "Branch", "Status", "Last Punch"];
        const rows = displayStudents.map(s => {
            const stat = attendanceMap[s.id] || {};
            const statusStr = stat.status || 'ABSENT';
            const timeStr = stat.time || '-';
            const roll = s.rollNumber || s.rollNo || s.id;
            return `"${roll}", "${s.name}", "${s.dept}", "${s.year}", "${s.branch || '-'}", "${statusStr}", "${timeStr}"`;
        });

        const csvContent = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `attendance_status_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header ... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Attendance Status</h2>
                    <p className="text-sm text-gray-500">Live roster view {profile?.dept ? `for ${profile.dept}` : 'by Department'}.</p>
                </div>
                <button
                    onClick={exportCSV}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                >
                    <Download size={18} /> Export List
                </button>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search Name or Roll No..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                </div>

                {/* Dropdowns */}
                <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
                    <select
                        className={`px - 3 py - 2 border border - gray - 300 rounded - lg bg - gray - 50 focus: outline - none focus: border - indigo - 500 ${profile?.dept ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''} `}
                        value={filters.dept}
                        onChange={(e) => setFilters(prev => ({ ...prev, dept: e.target.value }))}
                        disabled={!!profile?.dept} // Lock if HOD has department
                    >
                        <option value="">All Depts</option>
                        <option value="CSE">CSE</option>
                        <option value="AIDS">AID</option>
                        <option value="ECE">ECE</option>
                        <option value="MECH">MECH</option>
                        <option value="CIVIL">CIVIL</option>
                    </select>

                    <select
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500"
                        value={filters.year}
                        onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                    >
                        <option value="">All Years</option>
                        <option value="1">1ST</option>
                        <option value="2">2ND</option>
                        <option value="3">3RD</option>
                        <option value="4">4TH</option>
                    </select>

                    <select
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500"
                        value={filters.branch}
                        onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                    >
                        <option value="">All Branches</option>
                        {structureBranches.length > 0 ? (
                            structureBranches.map(b => (
                                <option key={b} value={b}>
                                    {b === 'AIDS' ? 'AID' : b}
                                </option>
                            ))
                        ) : (
                            <>
                                <option value="CSE">CSE</option>
                                <option value="AIDS">AID</option>
                                <option value="ECE">ECE</option>
                                <option value="MECH">MECH</option>
                                <option value="CIVIL">CIVIL</option>
                                <option value="EEE">EEE</option>
                                <option value="IT">IT</option>
                            </>
                        )}
                    </select>

                    <select
                        className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:border-indigo-500"
                        value={filters.section}
                        onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
                    >
                        <option value="">All Sections</option>
                        {structureSections.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Results Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100 uppercase tracking-wider">
                            <tr>
                                <th className="py-3 px-6">Student Info</th>
                                <th className="py-3 px-6">Academic</th>
                                <th className="py-3 px-6">Status</th>
                                <th className="py-3 px-6 text-right">Last Update</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="4" className="py-12 text-center text-gray-500">Loading live data...</td></tr>
                            ) : displayStudents.length === 0 ? (
                                <tr><td colSpan="4" className="py-12 text-center text-gray-500">No students found matching filters.</td></tr>
                            ) : (
                                displayStudents.map(student => {
                                    // Robust Lookup: Check ID, UID, or RollNo
                                    const status = attendanceMap[student.id] ||
                                        attendanceMap[student.uid] ||
                                        attendanceMap[student.rollNumber] ||
                                        { status: 'ABSENT' };

                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-6">
                                                <div className="font-bold text-gray-900">{student.name}</div>
                                                <div className="text-xs text-gray-400 font-mono">{student.rollNumber || student.rollNo || student.id.slice(0, 8)}</div>
                                            </td>
                                            <td className="py-3 px-6">
                                                <div className="text-gray-600">{student.dept}</div>
                                                <div className="text-xs text-gray-400">Year {student.year} • Sec {student.section || '-'}</div>
                                            </td>
                                            <td className="py-3 px-6">
                                                <StatusBadge status={status.status} />
                                            </td>
                                            <td className="py-3 px-6 text-right text-gray-500 font-mono text-xs">
                                                {status.time || '-'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                    <span>Showing {displayStudents.length} students</span>
                    <span>Status sync: Real-time</span>
                </div>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    if (status === 'INSIDE') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Present
            </span>
        );
    }
    if (status === 'LEFT') {
        return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                <UserCheck size={12} />
                Checked Out
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
            <UserX size={12} />
            Absent
        </span>
    );
}
