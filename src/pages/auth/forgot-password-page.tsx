import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { requestPasswordReset } from '@/lib/auth';
import adVideo from '../../../images/ad.mp4';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err: any) {
      setError(err.message || t('passwordResetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center p-4">
      <video autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-30">
        <source src={adVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-slate-900/60 to-emerald-900/40" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
              <Mail className="text-white" size={32} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">{t('forgotPasswordTitle')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8">{t('forgotPasswordCopy')}</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {sent && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <p>{t('passwordResetEmailSent')}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium px-1">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-lg font-bold rounded-2xl shadow-lg shadow-brand-500/20"
              disabled={isLoading || sent}
            >
              {isLoading ? t('loading') : t('sendResetLink')}
            </Button>
          </form>

          <p className="mt-6 text-center text-slate-500 dark:text-slate-400 text-sm">
            {t('rememberPassword')}{' '}
            <button type="button" onClick={() => navigate('/auth/login')} className="text-brand-600 font-bold hover:underline">
              {t('backToSignIn')}
            </button>
          </p>

          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">{t('passwordResetHint')}</p>

          <Link to="/auth/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
            <ArrowLeft size={16} />
            {t('backToSignIn')}
          </Link>
        </div>
      </div>
    </div>
  );
}
