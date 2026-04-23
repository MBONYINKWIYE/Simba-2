import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { resolvePostSignInPath } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getExchangeMarkerKey(authCode: string) {
  return `supabase-auth-code:${authCode}`;
}

async function resolveRedirectPath(nextPath: string) {
  if (!supabase) {
    return nextPath;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? resolvePostSignInPath(user.id, user.email, nextPath) : nextPath;
}

export function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setMessage(t('loadingSignIn'));
  }, [t]);

  useEffect(() => {
    let isActive = true;

    async function completeSignIn() {
        if (!supabase) {
          if (isActive) {
          setErrorMessage(t('supabaseNotConfigured'));
          }
          return;
        }

      const authCode = searchParams.get('code');
      const errorDescription = searchParams.get('error_description') ?? searchParams.get('error');
      const nextPath = searchParams.get('next') ?? '/checkout';

      if (errorDescription) {
        if (isActive) {
          setErrorMessage(errorDescription);
        }
        return;
      }

      if (!authCode) {
        if (isActive) {
          setErrorMessage(t('noAuthCode'));
        }
        return;
      }

      const exchangeMarkerKey = getExchangeMarkerKey(authCode);
      const existingExchangeState = window.sessionStorage.getItem(exchangeMarkerKey);

      if (existingExchangeState === 'done') {
        const redirectPath = await resolveRedirectPath(nextPath);
        navigate(redirectPath, { replace: true });
        return;
      }

      if (existingExchangeState === 'in_progress') {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!isActive) {
            return;
          }

          if (session?.user) {
            window.sessionStorage.setItem(exchangeMarkerKey, 'done');
            const redirectPath = await resolveRedirectPath(nextPath);
            navigate(redirectPath, { replace: true });
            return;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 500));
        }

        window.sessionStorage.removeItem(exchangeMarkerKey);
      }

      window.sessionStorage.setItem(exchangeMarkerKey, 'in_progress');
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

      if (!isActive) {
        return;
      }

      if (error) {
        window.sessionStorage.removeItem(exchangeMarkerKey);
        setErrorMessage(error.message);
        return;
      }

      window.sessionStorage.setItem(exchangeMarkerKey, 'done');
      setMessage(t('signInCompleteRedirecting'));
      const redirectPath = data.user ? await resolvePostSignInPath(data.user.id, data.user.email, nextPath) : nextPath;
      navigate(redirectPath, { replace: true });
    }

    void completeSignIn();

    return () => {
      isActive = false;
    };
  }, [navigate, searchParams, t]);

  return (
    <section className="glass-panel mx-auto max-w-xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold">{t('googleSignIn')}</h1>
      {!errorMessage ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      ) : (
        <>
          <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            {errorMessage}
          </p>
          <Button className="mt-5" onClick={() => navigate('/checkout', { replace: true })}>
            {t('backToCheckout')}
          </Button>
        </>
      )}
    </section>
  );
}
