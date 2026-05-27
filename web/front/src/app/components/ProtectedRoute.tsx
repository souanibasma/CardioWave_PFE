import { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useAuth, UserRole } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, pendingUser, isAuthenticated, isPending } = useAuth();

  // ── Doctor pending approval → redirect to waiting page ──
  if (isPending && pendingUser?.role === 'medecin') {
    return <Navigate to="/attente-validation" replace />;
  }

  // Extra safety: if a doctor user is loaded but not approved, keep them out
  if (user?.role === 'medecin' && !user.isApproved) {
    return <Navigate to="/attente-validation" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // ✅ Redirection selon le rôle réel — évite la boucle infinie
    if (user.role === 'patient') {
      return <Navigate to="/patient/dashboard" replace />;
    }
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/tableau-de-bord" replace />;
  }

  return <>{children}</>;
}