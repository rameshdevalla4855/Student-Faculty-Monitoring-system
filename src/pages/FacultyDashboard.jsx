import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { academicService } from '../services/academicService'; // Import Service
import FadeIn from '../components/FadeIn';
import { Helmet } from 'react-helmet-async';
import UserProfile from '../components/UserProfile';
import { User, Briefcase, MapPin, Calendar, Home, History, LogOut } from 'lucide-react';

// Tabs
import FacultyHomeTab from '../components/faculty/FacultyHomeTab';
import FacultyScheduleTab from '../components/faculty/FacultyScheduleTab';
import FacultyHistoryTab from '../components/faculty/FacultyHistoryTab';
import NotificationDropdown from '../components/common/NotificationDropdown';

export default function FacultyDashboard() {
    const { currentUser, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [assignments, setAssignments] = useState([]); // State for Classes
    const [schedule, setSchedule] = useState({}); // Weekly Schedule
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [status, setStatus] = useState('OUT'); // Default OUT
    const [activeTab, setActiveTab] = useState('home');

    useEffect(() => {
        const fetchProfileAndStatus = async () => {
            // Robust Email Lookup
            if (currentUser?.email) {
                try {
                    // 1. Profile
                    const qProfile = query(collection(db, "faculty"), where("email", "==", currentUser.email));
                    const profileSnap = await getDocs(qProfile);
                    if (!profileSnap.empty) setProfile(profileSnap.docs[0].data());

                    // 2. Fetch Assignments & Schedule (NEW)
                    if (currentUser.uid) {
                        const myClasses = await academicService.getMyAssignments(currentUser.uid);
                        setAssignments(myClasses);

                        // Aggregate Timetables
                        const uniqueContexts = [...new Set(myClasses.map(c => `${c.branch}_${c.year}_${c.section}`))];
                        const fullSchedule = {};

                        await Promise.all(uniqueContexts.map(async (ctx) => {
                            const [branch, year, section] = ctx.split('_');
                            const tt = await academicService.getTimetable(branch, year, section);

                            if (tt?.schedule) {
                                Object.entries(tt.schedule).forEach(([day, slots]) => {
                                    if (!fullSchedule[day]) fullSchedule[day] = [];

                                    const mySlots = slots.filter(s => {
                                        // Debug comparison
                                        const match = s.facultyId === currentUser.uid;
                                        return match;
                                    });

                                    mySlots.forEach(s => {
                                        fullSchedule[day].push({
                                            ...s,
                                            context: `${branch} Yr ${year} (${section})`
                                        });
                                    });
                                });
                            }
                        }));
                        setSchedule(fullSchedule);
                    }

                    // 3. Status (Latest Log Today)
                    const today = new Date().toLocaleDateString('en-CA');
                    const qLogs = query(
                        collection(db, "attendanceLogs"),
                        where("uid", "==", currentUser.uid),
                        where("date", "==", today)
                    );
                    const logsSnap = await getDocs(qLogs);

                    if (!logsSnap.empty) {
                        const logs = logsSnap.docs.map(d => d.data());
                        logs.sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis());
                        const lastLog = logs[0];
                        setStatus(lastLog.type === 'ENTRY' ? 'IN' : 'OUT');
                    } else {
                        setStatus('OUT');
                    }
                } catch (err) { console.error(err); }
            }
        };
        fetchProfileAndStatus();
    }, [currentUser]);

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <FacultyHomeTab profile={profile} status={status} schedule={schedule} />;
            case 'schedule': return <FacultyScheduleTab schedule={schedule} assignments={assignments} />;
            case 'history': return <FacultyHistoryTab />;
            default: return <FacultyHomeTab profile={profile} status={status} schedule={schedule} />;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-gray-900">
            <Helmet>
                <title>Faculty Dashboard | SFM System</title>
            </Helmet>

            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={profile} onLogout={logout} role="faculty" />

            {/* Header - Sticky */}
            <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl shadow-lg shadow-purple-200 flex items-center justify-center text-white">
                        <Briefcase size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900 leading-none">SFM Faculty</h1>
                        <p className="text-[10px] text-gray-500 font-semibold tracking-wide uppercase mt-0.5">Academic Portal</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <NotificationDropdown currentUser={currentUser} role="faculty" dept={profile?.dept} />

                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-50 to-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold shadow-sm"
                    >
                        {profile?.name?.charAt(0) || <User size={18} />}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 pt-20 pb-24 px-4 md:px-6 max-w-lg mx-auto w-full md:max-w-3xl lg:max-w-5xl">
                <FadeIn>
                    {renderContent()}
                </FadeIn>
            </main>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col fixed left-0 top-[73px] bottom-0 w-64 bg-white border-r border-gray-200 pt-6 px-4 z-20">
                <nav className="space-y-2 flex-1">
                    <SidebarItem id="home" label="Overview" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="schedule" label="Teaching Schedule" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="history" label="Attendance Log" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />
                </nav>
                <div className="pb-8">
                    <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl z-40 flex justify-between items-center px-6 py-3 ring-1 ring-gray-900/5">
                <NavTab id="home" label="Home" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="schedule" label="Schedule" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="history" label="History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />
            </nav>


        </div>
    );
}

function SidebarItem({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group ${isActive ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-gray-600 hover:bg-gray-50'
                }`}
        >
            <Icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-purple-600'} />
            <span className="font-semibold">{label}</span>
        </button>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`relative flex flex-col items-center gap-1 transition-all duration-300 w-16 ${isActive ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-purple-50 -translate-y-2 shadow-sm' : ''
                }`}>
                <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'
                }`}>
                {label}
            </span>
            {isActive && (
                <span className="absolute -bottom-2 w-1 h-1 bg-purple-600 rounded-full"></span>
            )}
        </button>
    );
}
