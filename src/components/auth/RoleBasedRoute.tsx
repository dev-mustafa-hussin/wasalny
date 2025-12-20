import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface RoleBasedRouteProps {
  allowedRoles: string[];
}

export function RoleBasedRoute({ allowedRoles }: RoleBasedRouteProps) {
  const { user, loading, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (userRole && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on actual role
    if (userRole === "admin") return <Navigate to="/admin" replace />;
    if (userRole === "driver") return <Navigate to="/driver" replace />;
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
