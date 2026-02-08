import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, limit } from 'firebase/firestore';
import FadeIn from '../components/FadeIn';
import { Helmet } from 'react-helmet-async';
import UserProfile from '../components/UserProfile';
import { academicService } from '../services/academicService';
import { User, Bell, ShieldCheck, MapPin, Briefcase, Clock, Calendar, Home, History, LogOut, BrainCircuit, ExternalLink } from 'lucide-react';

// Tabs
import StudentHomeTab from '../components/student/StudentHomeTab';
import StudentTimetableTab from '../components/student/StudentTimetableTab';
import StudentHistoryTab from '../components/student/StudentHistoryTab';
import NotificationDropdown from '../components/common/NotificationDropdown';



export default function StudentDashboard() {
    const { currentUser, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [timetable, setTimetable] = useState({});
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [status, setStatus] = useState('OUTSIDE');
    const [activeTab, setActiveTab] = useState('home'); // home | timetable | history

    // ... (useEffect remains same) ...

    const renderContent = () => {
        switch (activeTab) {
            case 'home': return <StudentHomeTab profile={profile} status={status} timetable={timetable} />;
            case 'timetable': return <StudentTimetableTab timetable={timetable} />;
            case 'history': return <StudentHistoryTab />;

            default: return <StudentHomeTab profile={profile} status={status} timetable={timetable} />;
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            if (currentUser?.email) {
                try {
                    const q = query(collection(db, "students"), where("email", "==", currentUser.email));
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const data = querySnapshot.docs[0].data();
                        setProfile(data);

                        // Fetch Classroom Assignments
                        const rawBranch = data.dept || data.branch || data.Branch || data.Depertment;
                        const rawYear = data.year || data.Year;

                        if (rawBranch && rawYear) {
                            const branch = rawBranch.toUpperCase();
                            const year = rawYear.toString().replace(/\D/g, '');
                            const section = data.section || "1";

                            if (branch && year) {
                                try {
                                    const [myClasses, myTimetable] = await Promise.all([
                                        academicService.getClassAssignments(branch, year, section),
                                        academicService.getTimetable(branch, year, section)
                                    ]);

                                    setAssignments(myClasses);
                                    setTimetable(myTimetable?.schedule || {});
                                } catch (e) {
                                    console.error("Error fetching academic data:", e);
                                }
                            }
                        }
                    }
                } catch (err) { console.error(err); }
            }
        };
        fetchProfile();

        // Listen for Real-time Status
        if (currentUser?.uid) {
            const statusQ = query(
                collection(db, "attendanceLogs"),
                where("uid", "==", currentUser.uid),
                orderBy("timestamp", "desc"),
                limit(1)
            );

            const unsubscribe = onSnapshot(statusQ, (snapshot) => {
                if (!snapshot.empty) {
                    const lastLog = snapshot.docs[0].data();
                    setStatus(lastLog.type === 'ENTRY' ? 'INSIDE' : 'OUTSIDE');
                }
            });
            return () => unsubscribe();
        }
    }, [currentUser]);



    // Immersive Mode removed


    return (
        <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-gray-900">
            <Helmet>
                <title>Student Dashboard | SFM System</title>
            </Helmet>

            <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} profile={profile} onLogout={logout} />

            {/* Header - Sticky */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 px-6 py-4 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
                        <ShieldCheck size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 leading-tight">SFM Student</h1>
                        <p className="text-xs text-gray-500 font-medium">My Campus</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <NotificationDropdown currentUser={currentUser} role="student" dept={profile?.departmentGroup || profile?.dept} />

                    <button
                        onClick={() => setIsProfileOpen(true)}
                        className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold hover:bg-indigo-100 transition-colors"
                    >
                        {profile?.name?.charAt(0) || <User size={20} />}
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full md:ml-64 md:max-w-[calc(100%-16rem)]">
                <FadeIn>
                    {renderContent()}
                </FadeIn>
            </main>

            {/* Bottom Navigation (Sidebar replacement for Mobile/Desktop Unified) */}
            {/* Note: User asked for side menu. For simplicity and consistency with HOD/Security, 
                we can use a fixed bottom nav on mobile and maybe a side nav on desktop? 
                Actually, the HOD Dashboard uses a bottom nav for everything (mobile style) which is simple.
                But the user EXPLICITLY asked for "Side Menu". 
                I will implement a responsive layout: Desktop Sidebar, Mobile Bottom Bar.
            */}

            {/* Desktop Sidebar (Hidden on Mobile) */}
            <aside className="hidden md:flex flex-col fixed left-0 top-[73px] bottom-0 w-64 bg-white border-r border-gray-200 pt-6 px-4 z-20">
                <nav className="space-y-2 flex-1">
                    <SidebarItem id="home" label="Overview" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="timetable" label="My Timetable" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                    <SidebarItem id="history" label="Attendance History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />

                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <div className="px-4 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Learning</span>
                        </div>
                        <SidebarItem
                            id="learnify"
                            label="Learnify AI"
                            icon={BrainCircuit}
                            activeTab={activeTab}
                            setActiveTab={() => window.open('https://learnify-ai-ochre.vercel.app', '_blank')}
                            isSpecial={true}
                            isExternal={true}
                        />
                    </div>
                </nav>
                <div className="pb-8">
                    <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors font-medium">
                        <LogOut size={20} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Nav (Visible only on Mobile) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 z-40 flex justify-around items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <NavTab id="home" label="Home" icon={Home} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="timetable" label="Timetable" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} />
                <NavTab id="history" label="History" icon={History} activeTab={activeTab} setActiveTab={setActiveTab} />
            </nav>


        </div>
    );
}

function SidebarItem({ id, label, icon: Icon, activeTab, setActiveTab, isSpecial, isExternal }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                : 'text-gray-600 hover:bg-gray-50'
                } ${isSpecial && !isActive ? 'hover:bg-purple-50' : ''}`}
        >
            <Icon size={20} className={isActive ? 'text-white' : isSpecial ? 'text-purple-600' : 'text-gray-400 group-hover:text-indigo-600'} />
            <span className={`font-semibold ${isSpecial && !isActive ? 'text-purple-700' : ''}`}>{label}</span>
            {isExternal && <ExternalLink size={14} className="ml-auto opacity-50" />}
            {isSpecial && !isExternal && <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">NEW</span>}
        </button>
    );
}

function NavTab({ id, label, icon: Icon, activeTab, setActiveTab }) {
    const isActive = activeTab === id;
    return (
        <button
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-1 min-w-[4rem] transition-all duration-300 ${isActive ? 'text-indigo-600 -translate-y-1' : 'text-gray-400 hover:text-gray-600'
                }`}
        >
            <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
            <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
            {isActive && <span className="w-1 h-1 bg-indigo-600 rounded-full absolute -bottom-2"></span>}
        </button>
    );
}
