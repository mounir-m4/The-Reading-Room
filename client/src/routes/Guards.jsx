import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/index.js';

export function CustomerGuard({ children }) {
  const { type, token } = useAppSelector((s) => s.auth);
  const location = useLocation();
  if (!token) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (type !== 'user') return <Navigate to="/admin" replace />;
  return children;
}

export function AdminGuard({ children, permission }) {
  const { type, token, user } = useAppSelector((s) => s.auth);
  const location = useLocation();
  if (!token) return <Navigate to={`/admin/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  if (type !== 'admin') return <Navigate to="/admin/login" replace />;
  const permissions = user?.role?.permissions || [];
  if (permission && user?.role?.name !== 'Super Admin' && !permissions.includes(permission)) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}

export function GuestGuard({ children }) {
  const { token, type } = useAppSelector((s) => s.auth);
  if (token && type === 'user') return <Navigate to="/account" replace />;
  return children;
}
