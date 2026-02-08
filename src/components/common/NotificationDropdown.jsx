import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../services/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Bell, Check, Info } from 'lucide-react';

export default function NotificationDropdown({ currentUser, role, dept }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!currentUser?.uid) return;

        // Query Logic:
        // 1. Target UID matches current user
        // OR
        // 2. Target Role matches current role AND (Target Dept is 'ALL' or matches current dept)

        // Firestore OR queries are limited, so we might need two listeners or client-side filter.
        // For simplicity and scalability limitations in standard firestore, we'll listen to a "notifications" collection
        // and filter client-side for the broad casts if needed, OR relies on a composite index.

        // Let's try a simplified approach:
        // We will listen to notifications where 'targetUid' == currentUser.uid (Direct messages)
        // AND 'targetRole' == role (Broadcasts)

        // Since we can't do complex OR in one stream easily without duplication, let's just query for the Role/Dept broadcast 
        // and assume direct messages are rare or handled separately, OR better yet:
        // Just Query for "targetRole" == role (e.g. 'student') 
        // AND sort by date. Then client-filter for Dept.

        const q = query(
            collection(db, "notifications"),
            where("targetRole", "in", [role, 'all']),
            orderBy("timestamp", "desc"),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(msg => {
                // Client-side filtering for Department
                if (msg.targetDept && msg.targetDept !== 'ALL' && msg.targetDept !== dept) {
                    return false;
                }
                return true;
            });

            setNotifications(msgs);
            // Simple unread count: count messages that don't have this user's ID in 'readBy' array
            // Optimization: For broad casts, 'readBy' array might get large. 
            // For now, let's just show total recent messages as "unread" if we want, or just a dot if there are any.
            // Let's assume all are "new" for now or use a local storage "lastReadTime" comparison.

            const lastReadTime = localStorage.getItem(`lastReadNotif_${currentUser.uid}`) || 0;
            const newCount = msgs.filter(m => m.timestamp?.toMillis() > Number(lastReadTime)).length;
            setUnreadCount(newCount);
        });

        return () => unsubscribe();
    }, [currentUser, role, dept]);

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Mark as read (locally) by updating timestamp
            setUnreadCount(0);
            localStorage.setItem(`lastReadNotif_${currentUser.uid}`, Date.now());
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleOpen}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-700">Notifications</h3>
                        <span className="text-xs text-gray-400">Recent</span>
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400">
                                <Info size={24} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map(notif => (
                                    <div key={notif.id} className="p-4 hover:bg-gray-50 transition-colors">
                                        <div className="flex gap-3">
                                            <div className="mt-1">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                    {notif.senderRole?.charAt(0).toUpperCase() || 'S'}
                                                </div>
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-semibold text-gray-900 leading-tight mb-1">{notif.title}</h4>
                                                <p className="text-xs text-gray-600 leading-relaxed mb-1.5">{notif.message}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">
                                                    {notif.timestamp?.toDate().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
