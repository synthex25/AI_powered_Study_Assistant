import type { FC } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks';

/**
 * Protected route wrapper that redirects to login if not authenticated
 */
const ProtectedRoute: FC = () => {
  const { token } = useAppSelector((state) => state.persisted.user);

  // Check both Redux state and localStorage for token
  const isAuthenticated = !!(token);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
