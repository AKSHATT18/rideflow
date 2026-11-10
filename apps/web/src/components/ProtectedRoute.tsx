import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../store/authStore';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their respective dashboard if they try to access another role's area
    const routes: Record<Role, string> = {
      PASSENGER: '/passenger',
      DRIVER: '/driver',
      ADMIN: '/admin'
    };
    return <Navigate to={routes[user.role] || '/'} replace />;
  }

  return <Outlet />;
};
