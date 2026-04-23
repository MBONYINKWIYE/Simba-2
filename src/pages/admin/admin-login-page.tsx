import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useAuthRole } from '@/hooks/use-auth-role';
import { signInWithGoogle, signOut } from '@/lib/auth';

export function AdminLoginPage() {
  const { t } = useTranslation();
  const { user, isConfigured, isLoading } = useAuth();
  const authRoleQuery = useAuthRole();

  if (!isConfigured) {
    return <section className="glass-panel mx-auto max-w-2xl p-6">{t('supabaseNotConfigured')}</section>;
  }

  if (isLoading || (user && authRoleQuery.isLoading)) {
    return <section className="glass-panel mx-auto max-w-2xl p-6">{t('loadingAccount')}</section>;
  }

  if (user && (authRoleQuery.data?.role === 'shop_admin' || authRoleQuery.data?.role === 'super_admin')) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <section className="glass-panel mx-auto max-w-2xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold">{t('adminLoginTitle')}</h1>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('adminLoginCopy')}</p>

      {user && authRoleQuery.data?.role !== 'shop_admin' ? (
        <div className="mt-6 rounded-3xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
          <p>{t('adminUnauthorized')}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => void signOut()} variant="secondary">
              {t('signOut')}
            </Button>
            <Link to="/">
              <Button>{t('keepShopping')}</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => void signInWithGoogle('/admin')}>{t('continueWithGoogle')}</Button>
          <Link to="/">
            <Button variant="secondary">{t('keepShopping')}</Button>
          </Link>
        </div>
      )}
    </section>
  );
}
