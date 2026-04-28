import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useAuthRole } from '@/hooks/use-auth-role';

type AdminRouteProps = PropsWithChildren<{
  requireStaff?: boolean;
}>;

export function AdminRoute({ children, requireStaff = false }: AdminRouteProps) {
  const { t } = useTranslation();
  const { user, isLoading, isConfigured } = useAuth();
  const authRoleQuery = useAuthRole();

  if (!isConfigured) {
    return <div className="glass-panel p-6">{t('supabaseNotConfigured')}</div>;
  }

  if (isLoading || (user && authRoleQuery.isLoading)) {
    return (
      <div className="glass-panel p-6">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 w-1/2 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-3/4 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-40 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={requireStaff ? '/staff/login' : '/admin/login'} replace />;
  }

  if (authRoleQuery.data?.role !== 'shop_admin' && authRoleQuery.data?.role !== 'super_admin') {
    return <Navigate to={requireStaff ? '/staff/login' : '/admin/login'} replace />;
  }

  if (requireStaff) {
    if (authRoleQuery.data?.adminRole !== 'staff') {
      return <Navigate to="/admin" replace />;
    }

    return <>{children}</>;
  }

  if (authRoleQuery.data?.role === 'shop_admin' && authRoleQuery.data?.adminRole === 'staff') {
    return <Navigate to="/staff" replace />;
  }

  return <>{children}</>;
}
