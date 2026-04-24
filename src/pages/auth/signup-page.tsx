import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signUpWithEmail, signInWithGoogle } from '@/lib/auth';
import adVideo from '../../../images/ad.mp4';

export default function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await signUpWithEmail(email, password, fullName);
      setSuccess(true);
      setTimeout(() => {
        navigate(`/auth/login?next=${encodeURIComponent(nextPath)}`);
      }, 3000);
    } catch (err: any) {
      setError(err.message || t('authError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle(nextPath);
    } catch (err: any) {
      setError(err.message || t('failedToStartGoogleSignIn'));
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center p-4">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      >
        <source src={adVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-br from-brand-900/40 via-slate-900/60 to-emerald-900/40" />

      <div className="relative z-10 w-full max-w-md">
        <div className="glass-panel p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-3">
              <UserPlus className="text-white" size={32} />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2">{t('signUp')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8">
            Create your Simba Supermarket account
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-sm">
              <CheckCircle2 size={18} className="shrink-0" />
              <p>{t('signUpSuccess')}</p>
            </div>
          )}

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium px-1">{t('fullName')}</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

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

            <div className="space-y-2">
              <label className="text-sm font-medium px-1">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 text-lg font-bold rounded-2xl shadow-lg shadow-brand-500/20"
              disabled={isLoading || success}
            >
              {isLoading ? t('loading') : t('createAccount')}
            </Button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-slate-900 px-4 text-slate-500">Or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            <span className="font-semibold">{t('googleSignIn')}</span>
          </button>

          <p className="mt-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            {t('haveAccount')}{' '}
            <Link to="/auth/login" className="text-brand-600 font-bold hover:underline">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
