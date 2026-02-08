import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, setDoc } from 'firebase/firestore';
import { Save, Search, ShieldAlert, UserX, UserCheck, Clock, Bell, Lock } from 'lucide-react';

export default function SettingsTab() {
    // System Rules State
    const [rules, setRules] = useState({
        entryStartTime: '08:00',
        entryEndTime: '10:00',
        exitStartTime: '16:00',
        exitEndTime: '18:00',
        maintenanceMode: false
    });
    const [ruleStatus, setRuleStatus] = useState('');

    // Access Control State
    const [searchQuery, setSearchQuery] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState('');
    const [blockLoading, setBlockLoading] = useState(false);

    // Initial Load - Fetch Global Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "global_rules");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setRules(docSnap.data());
                } else {
                    // Initialize if not exists
                    await setDoc(docRef, rules);
                }
            } catch (err) {
                console.error("Error loading settings:", err);
            }
        };
        fetchSettings();
    }, []);

    // --- 1. SYSTEM RULES LOGIC ---
    const handleSaveRules = async () => {
        setRuleStatus('Saving...');
        try {
            await setDoc(doc(db, "settings", "global_rules"), rules);
            setRuleStatus('Saved Successfully!');
            setTimeout(() => setRuleStatus(''), 2000);
        } catch (err) {
            console.error(err);
            setRuleStatus('Error Saving.');
        }
    };

    // --- 2. ACCESS CONTROL LOGIC ---
    const handleSearch = async () => {
        setSearchError('');
        setFoundUser(null);
        if (!searchQuery.trim()) return;

        try {
            // Search Students
            const qStudent = query(collection(db, "students"), where("rollNumber", "==", searchQuery.trim())); // Assuming rollNumber is field
            // Note: In our import tab we used docId as rollNumber, but 'rollNumber' field is also stored.
            // Also user might search by docID directly.
            // Let's try direct doc get first (best for unique IDs)

            let userDoc = await getDoc(doc(db, "students", searchQuery.trim()));
            let collectionName = "students";

            if (!userDoc.exists()) {
                // Try Faculty
                userDoc = await getDoc(doc(db, "faculty", searchQuery.trim()));
                collectionName = "faculty";
            }

            if (userDoc.exists()) {
                setFoundUser({ id: userDoc.id, ...userDoc.data(), collectionName });
            } else {
                setSearchError('User not found. Check Roll No / Faculty ID.');
            }
        } catch (err) {
            setSearchError('Search failed.');
            console.error(err);
        }
    };

    const toggleBlock = async () => {
        if (!foundUser) return;
        setBlockLoading(true);
        try {
            const newStatus = !foundUser.isBlocked;
            const userRef = doc(db, foundUser.collectionName, foundUser.id);
            await updateDoc(userRef, { isBlocked: newStatus });

            setFoundUser(prev => ({ ...prev, isBlocked: newStatus }));
        } catch (err) {
            console.error("Error updating block status:", err);
            alert("Failed to update status.");
        } finally {
            setBlockLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* 1. CAMPUS RULES SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Clock className="text-indigo-600" size={20} />
                            Campus Time Rules
                        </h3>
                        <p className="text-sm text-gray-500">Define allowed entry and exit windows.</p>
                    </div>
                    {ruleStatus && <span className="text-sm font-medium text-green-600 animate-pulse">{ruleStatus}</span>}
                </div>
                <div className="p-6 grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-700">Entry Window</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50"
                                    value={rules.entryStartTime}
                                    onChange={(e) => setRules(p => ({ ...p, entryStartTime: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">End Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50"
                                    value={rules.entryEndTime}
                                    onChange={(e) => setRules(p => ({ ...p, entryEndTime: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="font-medium text-gray-700">Exit Window</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500">Start Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50"
                                    value={rules.exitStartTime}
                                    onChange={(e) => setRules(p => ({ ...p, exitStartTime: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">End Time</label>
                                <input
                                    type="time"
                                    className="w-full p-2 border rounded-lg bg-gray-50"
                                    value={rules.exitEndTime}
                                    onChange={(e) => setRules(p => ({ ...p, exitEndTime: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={handleSaveRules}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium"
                    >
                        <Save size={18} /> Update Rules
                    </button>
                </div>
            </div>

            {/* 2. ACCESS CONTROL SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Lock className="text-red-500" size={20} />
                        Access Control
                    </h3>
                    <p className="text-sm text-gray-500">Instant block/unblock for students or faculty.</p>
                </div>
                <div className="p-6">
                    <div className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Enter Roll No or Faculty ID..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black font-medium"
                        >
                            Search
                        </button>
                    </div>

                    {searchError && <p className="text-red-500 text-sm mb-4">{searchError}</p>}

                    {foundUser && (
                        <div className="p-4 border border-gray-200 rounded-xl bg-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-sm ${foundUser.isBlocked ? 'bg-red-500' : 'bg-green-500'}`}>
                                    {foundUser.name?.[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">{foundUser.name}</h4>
                                    <div className="text-xs text-gray-500 font-mono">{foundUser.id} • {foundUser.dept}</div>
                                    <div className={`text-xs font-bold mt-1 ${foundUser.isBlocked ? 'text-red-600' : 'text-green-600'}`}>
                                        STATUS: {foundUser.isBlocked ? 'BLOCKED' : 'ACTIVE'}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={toggleBlock}
                                disabled={blockLoading}
                                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white shadow-sm transition-all ${foundUser.isBlocked
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {foundUser.isBlocked ? (
                                    <><UserCheck size={18} /> Unblock User</>
                                ) : (
                                    <><UserX size={18} /> Block User</>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 3. NOTIFICATIONS SECTION */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden opacity-75">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Bell className="text-amber-500" size={20} />
                        Notification Preferences
                    </h3>
                    <p className="text-sm text-gray-500">Configure automated alerts (Coming Soon).</p>
                </div>
                <div className="p-6 space-y-4">
                    <label className="flex items-center gap-3 text-gray-700 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" defaultChecked />
                        <span>Email me weekly attendance summaries</span>
                    </label>
                    <label className="flex items-center gap-3 text-gray-700 cursor-pointer">
                        <input type="checkbox" className="w-5 h-5 rounded text-indigo-600" />
                        <span>SMS Alert when system detects &gt; 10% absent</span>
                    </label>
                </div>
            </div>

        </div>
    );
}
