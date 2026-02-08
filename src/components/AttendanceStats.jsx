import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, getCountFromServer, getDocs } from 'firebase/firestore';
import { Users, UserCheck, Briefcase, AlertTriangle } from 'lucide-react';

export default function AttendanceStats() {
    const [stats, setStats] = useState({
        activeStudents: 0,
        totalEntries: 0,
        facultyCount: 0,
        alerts: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Use Local Date to ensure stats reset at midnight local time, not UTC.
                // 'en-CA' format is YYYY-MM-DD.
                const today = new Date().toLocaleDateString('en-CA');
                const logsRef = collection(db, "attendanceLogs");
                const alertsRef = collection(db, "securityAlerts");

                // 1. Fetch ALL Logs for Today (Single Read for Client-side Aggregation)
                // This reduces reads compared to multiple count queries if we need complex "Inside" logic
                const qLogs = query(logsRef, where("date", "==", today));
                const logsSnap = await getDocs(qLogs);

                // Process Logs to find "Currently Inside"
                const studentStatus = {};
                const facultyStatus = {};

                logsSnap.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.role === 'student') {
                        // Store latest log type based on timestamp (assuming logs come in rough order or we sort)
                        // Actually, Firestore order isn't guaranteed without sort.
                        // But usually appends are fine. For 100% accuracy, we should track timestamp.
                        // Simple toggle logic: If key exists and last was ENTRY, now EXIT? 
                        // Let's just use the 'type' of the specific log to overwrite. 
                        // But we need the LATEST. 
                        // If we didn't sort, we might overwrite a later ENTRY with an earlier EXIT.
                        // Let's rely on the fact that we process strictly? No.
                        // We must Request Ordered.
                        // BUT indexes might be missing.
                        // Let's do client side sort.
                    }
                });

                // REVISING STRATEGY: 
                // We will fetch ordered logs. Index *should* exist or be suggested.
                // Assuming Index exists (timestamp desc).
                // Actually, let's just use "Checked In Today" (Total Unique Logins) vs "Currently Inside"
                // User asked for "Faculty Present" -> Likely means inside.

                // Let's try fetching ordered.
                // const qOrdered = query(logsRef, where("date", "==", today), orderBy("timestamp", "asc"));
                // If index missing, it errors.

                // Fallback: Fetch all, sort in JS.
                const logs = logsSnap.docs.map(d => d.data());
                logs.sort((a, b) => (a.timestamp?.toMillis() || 0) - (b.timestamp?.toMillis() || 0));

                const currentStatus = new Map(); // uid -> type

                logs.forEach(log => {
                    currentStatus.set(log.uid, { type: log.type, role: log.role });
                });

                let activeStudents = 0;
                let activeFaculty = 0;

                currentStatus.forEach((val) => {
                    if (val.type === 'ENTRY') {
                        if (val.role === 'faculty') activeFaculty++;
                        else activeStudents++;
                    }
                });

                // 2. Alerts Count
                const qAlerts = query(alertsRef, where("date", "==", today));
                const alertsSnap = await getCountFromServer(qAlerts);

                setStats({
                    activeStudents: activeStudents,
                    facultyCount: activeFaculty,
                    alerts: alertsSnap.data().count
                });
            } catch (err) {
                console.error("Stats error:", err);
            }
        };

        fetchStats();
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, []);

    const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition-shadow">
            <div>
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
                <p className={`text-xs font-medium mt-1 ${color}`}>{subtext}</p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity ${color.replace('text-', 'bg-')}`}>
                <Icon size={24} className={color} />
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
                title="Students On Campus"
                value={stats.activeStudents}
                icon={Users}
                color="text-blue-600"
                subtext="Currently Inside"
            />
            <StatCard
                title="Faculty Present"
                value={stats.facultyCount}
                icon={Briefcase}
                color="text-purple-600"
                subtext="Currently Inside"
            />
            <StatCard
                title="System Alerts"
                value={stats.alerts}
                icon={AlertTriangle}
                color="text-red-500"
                subtext="Today's Incidents"
            />
        </div>
    );
}
