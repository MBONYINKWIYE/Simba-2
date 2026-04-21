import { BrandLogo } from '@/components/layout/brand-logo';

export function Footer() {
  return (
    <footer className="border-t border-slate-200/70 py-8 dark:border-slate-800">
      <div className="container-shell flex flex-col gap-3 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo compact className="gap-2" />
          <p>Simba Supermarket. Optimized for Kigali shoppers, delivery teams, and low-friction checkout.</p>
        </div>
        <p>Vite + React + TypeScript + Tailwind + Supabase</p>
      </div>
    </footer>
  );
}
