import { Link } from 'react-router-dom';

const sections = [
  'Frontend: Vite + React + TypeScript + Tailwind, route-level code splitting, React Query cache, Zustand cart/preferences.',
  'Backend: Supabase Postgres with a denormalized catalog_products table for fast listing queries and optional orders/customers tables.',
  'Import: JSON feed normalized via scripts/prepare-seed.mjs into a JSON payload ready for Supabase import or scripted upsert.',
  'Performance: local fallback catalog, debounced search, lazy-loaded images, compact schema, and build-time asset optimization.',
];

export function ArchitecturePage() {
  return (
    <section className="glass-panel p-6">
      <h1 className="text-3xl font-bold">Architecture</h1>
      <div className="mt-6 space-y-4">
        {sections.map((section) => (
          <div key={section} className="rounded-3xl bg-stone-100 p-4 dark:bg-slate-900">
            {section}
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">
        The repo also includes full setup notes, SQL schema, environment variables, and deployment guidance in the README and Supabase SQL files.
      </p>
      <Link to="/" className="mt-6 inline-flex text-sm font-semibold text-brand-600">
        Return to storefront
      </Link>
    </section>
  );
}
