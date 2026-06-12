import logoImg from '../../../images/logo.png';

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
};

export function BrandLogo({ compact = false, className = '' }: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className="h-12 w-12 flex items-center justify-center rounded-full bg-white shadow-sm overflow-hidden shrink-0 border border-slate-100">
        <img
          src={logoImg}
          alt="Simba Logo"
          className="h-full w-full object-cover scale-150"
        />
      </div>

      {compact ? null : (
        <div className="min-w-0">
          <p className="text-lg font-black uppercase tracking-[0.16em] text-slate-950 dark:text-white">Simba</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600 dark:text-brand-400">
            Supermarket
          </p>
        </div>
      )}
    </div>
  );
}
