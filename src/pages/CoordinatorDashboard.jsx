import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { Layout, GitBranch, Users, LogOut, Calendar, User, Bell, PieChart } from 'lucide-react';
import UserProfile from '../components/UserProfile';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Tabs
import StructureManager from '../components/coordinator/StructureManager';
import FacultyMapper from '../components/coordinator/FacultyMapper';
import TimetableManager from '../components/coordinator/TimetableManager';
import NotificationManagerTab from '../components/hod/NotificationManagerTab';
import AttendanceStatusTab from '../components/hod/AttendanceStatusTab';

export default function CoordinatorDashboard() {
    const { currentUser, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('structure');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profile, setProfile] = useState(null);

    // Fetch Profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.email) {
                try {
                    const q = query(collection(db, "coordinators"), where("email", "==", currentUser.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        setProfile(querySnapshot.docs[0].data());
                    }
                } catch (err) {
                    console.error("Error fetching Coordinator profile:", err);
                }
            }
        };
        fetchProfile();
    }, [currentUser]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-gray-900 flex flex-col">
            <Helmet>
                <title>Coordinator Portal | SFM System</title>
            </Helmet>

            {/* HEADER - Fixed Glass */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center text-white">
                        <Layout size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-none">SFM Admin</h1>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-0.5">Coordinator</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                    >
                        {profile?.name?.charAt(0) || <User size={18} />}
                    </button>
                </div>
            </header>

            <UserProfile
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                profile={profile}
                onLogout={logout}
                role="coordinator"
            />

            {/* MAIN CONTENT */}
            <main className="flex-1 pt-20 pb-28 px-4 md:px-6 max-w-7xl mx-auto w-full">
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="min-h-[500px]">
                        {activeTab === 'structure' && <StructureManager profile={profile} />}
                        {activeTab === 'faculty' && <FacultyMapper profile={profile} />}
                        {activeTab === 'timetable' && <TimetableManager profile={profile} />}
                        {activeTab === 'status' && <AttendanceStatusTab profile={profile} />}
                        {activeTab === 'notify' && <NotificationManagerTab profile={profile} role="coordinator" />}
                    </div>
                </div>
            </main>

            {/* BOTTOM NAVIGATION */}
            <nav className="fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl z-40 flex justify-between items-center px-4 py-2 ring-1 ring-gray-900/5">
                <NavTab id="structure" label="Struct" icon={GitBranch} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="faculty" label="Faculty" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="timetable" label="Time" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="status" label="Status" icon={PieChart} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="notify" label="Notify" icon={Bell} activeTab={activeTab} setActiveTab={setActiveTab} />
            </nav>
        </div>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-14 ${isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-indigo-50 -translate-y-2 shadow-sm' : ''
                }`}>
                <Icon size={isActive ? 20 : 18} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[9px] font-bold transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'
                }`}>
                {label}
            </span>
            {isActive && (
                <span className="absolute -bottom-2 w-1 h-1 bg-indigo-600 rounded-full"></span>
            )}
        </button>
    );
}
