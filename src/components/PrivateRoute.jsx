import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ children, role, allowedRoles }) {
    const { currentUser, userRole, loading } = useAuth();

    // Normalize roles: prioritize 'allowedRoles' array, fallback to 'role' string (wrapped in array)
    const requiredRoles = allowedRoles || (role ? [role] : []);

    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // If roles are specified, check permissions
    if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-red-600">
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p>You do not have permission to view this page.</p>
                <p className="text-sm text-gray-500 mt-2">Required: {requiredRoles.join(', ')} | Yours: {userRole}</p>
            </div>
        );
    }

    // Render children if present (Wrapper pattern), otherwise Outlet (Layout pattern)
    return children ? children : <Outlet />;
}
