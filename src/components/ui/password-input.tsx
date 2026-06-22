import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  minLength?: number;
};

export function PasswordInput({
  id,
  value,
  onChange,
  label,
  placeholder = '••••••••',
  error,
  disabled,
  required,
  minLength,
}: PasswordInputProps) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium px-1">{label}</label>}
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full pl-11 pr-12 py-3 bg-white/50 dark:bg-slate-800/50 border rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none transition-all ${
            error
              ? 'border-red-300 dark:border-red-700'
              : 'border-slate-200 dark:border-slate-700'
          }`}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          aria-label={show ? t('passwordHide') : t('passwordShow')}
          tabIndex={-1}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
