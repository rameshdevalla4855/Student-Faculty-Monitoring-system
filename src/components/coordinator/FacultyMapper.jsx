import { useState, useEffect } from 'react';
import { academicService } from '../../services/academicService';
import { useAuth } from '../../context/AuthContext';
import { UserCheck, BookOpen, Trash2 } from 'lucide-react';

export default function FacultyMapper({ profile }) {
    const { currentUser } = useAuth();
    const [structure, setStructure] = useState(null);
    const [facultyList, setFacultyList] = useState([]);
    const [assignments, setAssignments] = useState([]);

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [branch, setBranch] = useState('');
    const [year, setYear] = useState(1);
    const [section, setSection] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');

    // List Filters
    const [filterYear, setFilterYear] = useState('');

    const coordinatorDept = profile?.dept || profile?.branch;

    useEffect(() => {
        loadData();
    }, []);

    // Refresh assignments when branch changes
    useEffect(() => {
        if (branch) loadAssignments(branch);
    }, [branch]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [struct, faculty] = await Promise.all([
                academicService.getStructure(),
                academicService.getAllFaculty()
            ]);
            setStructure(struct);
            setFacultyList(faculty);

            // Access Control Logic
            let availableBranches = struct.branches;
            if (coordinatorDept) {
                // Check map first
                const mapped = struct.departmentMap?.[coordinatorDept];
                if (mapped && mapped.length > 0) {
                    availableBranches = mapped;
                } else if (struct.branches.includes(coordinatorDept)) {
                    // Fallback to own dept if valid branch
                    availableBranches = [coordinatorDept];
                }
            }

            // Store filtered branches in state or just derive during render? 
            // Better to store in structure object equivalent or memoize.
            // For now, let's attach to structure to mock it for the UI
            struct.availableBranches = availableBranches;

            // Initialize Form
            if (availableBranches?.[0]) setBranch(availableBranches[0]);
            if (struct?.sections?.[0]) setSection(struct.sections[0]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadAssignments = async (b) => {
        const data = await academicService.getDepartmentAssignments(b);
        setAssignments(data);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this assignment?")) return;
        try {
            await academicService.deleteAssignment(id);
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error("Failed to delete", err);
            alert("Failed to delete assignment");
        }
    };

    const handleAssign = async () => {
        if (!selectedFaculty || !selectedSubject) {
            alert("Please select Faculty and Subject.");
            return;
        }

        const fac = facultyList.find(f => f.id === selectedFaculty);
        const sub = structure.subjects.find(s => s.code === selectedSubject);

        if (!fac || !sub) return;

        setSubmitting(true);
        try {
            await academicService.assignFaculty(currentUser.uid, {
                facultyId: fac.id,
                facultyName: fac.name || fac.email,
                branch,
                year: Number(year),
                section,
                subjectCode: sub.code,
                subjectName: sub.name,
                academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
            });
            await loadAssignments(branch);
            alert("Faculty assigned successfully!");
        } catch (err) {
            console.error(err);
            alert("Assignment failed.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter subjects based on selected Branch/Year
    const filteredSubjects = structure?.subjects?.filter(
        s => s.branch === branch && s.year === Number(year)
    ) || [];

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Academic Data...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ASSIGNMENT FORM */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <UserCheck size={20} className="text-indigo-600" /> Assign Faculty
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Target Class</label>
                            <div className="grid grid-cols-3 gap-2 mt-1">
                                <select className="p-2 border rounded text-sm w-full" value={branch} onChange={e => setBranch(e.target.value)}>
                                    {structure?.availableBranches?.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                                <select className="p-2 border rounded text-sm w-full" value={year} onChange={e => setYear(e.target.value)}>
                                    {structure?.years?.map(y => <option key={y} value={y}>Yr {y}</option>)}
                                </select>
                                <select className="p-2 border rounded text-sm w-full" value={section} onChange={e => setSection(e.target.value)}>
                                    {structure?.sections?.map(s => <option key={s} value={s}>Sec {s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Subject</label>
                            <select
                                className="w-full p-2 border rounded mt-1"
                                value={selectedSubject}
                                onChange={e => setSelectedSubject(e.target.value)}
                            >
                                <option value="">Select Subject</option>
                                {filteredSubjects.map(s => (
                                    <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                                ))}
                            </select>
                            {filteredSubjects.length === 0 && (
                                <p className="text-xs text-red-400 mt-1">No subjects found for {branch} Yr {year}. Add them in Structure tab.</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Faculty</label>
                            <select
                                className="w-full p-2 border rounded mt-1"
                                value={selectedFaculty}
                                onChange={e => setSelectedFaculty(e.target.value)}
                            >
                                <option value="">Select Faculty Member</option>
                                {facultyList.map(f => (
                                    <option key={f.id} value={f.id}>{f.name} ({f.email})</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleAssign}
                            disabled={submitting || filteredSubjects.length === 0}
                            className="w-full py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {submitting ? "Assigning..." : "Assign Faculty"}
                        </button>
                    </div>
                </div>

                {/* CURRENT ASSIGNMENTS LIST */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 border-b pb-2">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <BookOpen size={20} className="text-indigo-600" />
                            <span>Assignments <span className="text-gray-400 font-normal">/ {branch}</span></span>
                        </h3>

                        <div className="flex items-center gap-2">
                            <select
                                className="px-3 py-1.5 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                            >
                                <option value="">All Years</option>
                                {structure?.years?.map(y => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                            <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1.5 rounded whitespace-nowrap">
                                2024-25
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto min-h-[300px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 uppercase border-b">
                                <tr>
                                    <th className="p-3">Class</th>
                                    <th className="p-3">Subject</th>
                                    <th className="p-3">Faculty</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {assignments.filter(a => !filterYear || Number(a.year) === Number(filterYear)).length === 0 ? (
                                    <tr><td colSpan="4" className="p-8 text-center text-gray-400">
                                        {assignments.length === 0 ? `No assignments for ${branch} yet.` : `No assignments found for Year ${filterYear}.`}
                                    </td></tr>
                                ) : (
                                    assignments
                                        .filter(a => !filterYear || Number(a.year) === Number(filterYear))
                                        .map(ass => (
                                            <tr key={ass.id} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    <span className="font-bold text-gray-700">Yr {ass.year} - {ass.section}</span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-900">{ass.subjectName}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{ass.subjectCode}</div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                                            {ass.facultyName?.charAt(0)}
                                                        </div>
                                                        <span className="text-gray-700 font-medium text-xs">
                                                            {ass.facultyName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => handleDelete(ass.id)}
                                                        className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
