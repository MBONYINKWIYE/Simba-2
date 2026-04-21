import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

function getExchangeMarkerKey(authCode: string) {
  return `supabase-auth-code:${authCode}`;
}

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Completing sign-in...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isActive = true;

    async function completeSignIn() {
      if (!supabase) {
        if (isActive) {
          setErrorMessage('Supabase is not configured.');
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
          setErrorMessage('No auth code was returned from Google.');
        }
        return;
      }

      const exchangeMarkerKey = getExchangeMarkerKey(authCode);
      const existingExchangeState = window.sessionStorage.getItem(exchangeMarkerKey);

      if (existingExchangeState === 'done') {
        navigate(nextPath, { replace: true });
        return;
      }

      if (existingExchangeState === 'in_progress') {
        return;
      }

      window.sessionStorage.setItem(exchangeMarkerKey, 'in_progress');
      const { error } = await supabase.auth.exchangeCodeForSession(authCode);

      if (!isActive) {
        return;
      }

      if (error) {
        window.sessionStorage.removeItem(exchangeMarkerKey);
        setErrorMessage(error.message);
        return;
      }

      window.sessionStorage.setItem(exchangeMarkerKey, 'done');
      setMessage('Sign-in complete. Redirecting...');
      navigate(nextPath, { replace: true });
    }

    void completeSignIn();

    return () => {
      isActive = false;
    };
  }, [navigate, searchParams]);

  return (
    <section className="glass-panel mx-auto max-w-xl p-6 sm:p-8">
      <h1 className="text-3xl font-bold">Google sign-in</h1>
      {!errorMessage ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{message}</p>
      ) : (
        <>
          <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-900/20 dark:text-rose-300">
            {errorMessage}
          </p>
          <Button className="mt-5" onClick={() => navigate('/checkout', { replace: true })}>
            Back to checkout
          </Button>
        </>
      )}
    </section>
  );
}
