import { MapPin, Phone, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShops } from '@/hooks/use-shops';

const STATIC_BRANCHES = [
  {
    name: 'Simba Supermarket - Centenary House',
    address: 'Centenary House, KN 5 Rd, Kigali',
    phone: '+250 788 123 456',
    hours: '7:00 AM – 10:30 PM',
    coordinates: { lat: -1.9441, lng: 30.0619 },
  },
  {
    name: 'Simba Supermarket - Kigali Heights',
    address: 'Kigali Heights, KG 7 Ave, Kigali',
    phone: '+250 788 123 457',
    hours: '7:00 AM – 10:30 PM',
    coordinates: { lat: -1.9574, lng: 30.0605 },
  },
  {
    name: 'Simba Supermarket - Gisozi',
    address: 'Gisozi, KG 15 Ave, Kigali',
    phone: '+250 788 123 458',
    hours: '7:00 AM – 10:30 PM',
    coordinates: { lat: -1.9241, lng: 30.0735 },
  },
];

export function BranchesPage() {
  const { t } = useTranslation();
  const { data: shops, isLoading } = useShops();
  const branches = (shops && shops.length > 0) ? shops : STATIC_BRANCHES;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t('branches')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('branchesCopy')}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch, index) => (
            <article
              key={'id' in branch ? branch.id : index}
              className="glass-panel overflow-hidden transition hover:shadow-md"
            >
              <div className="aspect-[16/9] overflow-hidden bg-stone-100 dark:bg-slate-800">
                <iframe
                  title={branch.name}
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    'longitude' in branch
                      ? `${branch.longitude - 0.01},${branch.latitude - 0.01},${branch.longitude + 0.01},${branch.latitude + 0.01}`
                      : `${branch.coordinates.lng - 0.01},${branch.coordinates.lat - 0.01},${branch.coordinates.lng + 0.01},${branch.coordinates.lat + 0.01}`
                  }&layer=mapnik&marker=${
                    'latitude' in branch
                      ? `${branch.latitude},${branch.longitude}`
                      : `${branch.coordinates.lat},${branch.coordinates.lng}`
                  }`}
                  className="h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4 space-y-3">
                <h3 className="text-lg font-bold">{branch.name}</h3>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-brand-600" />
                    <span>{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="shrink-0 text-brand-600" />
                    <span>{branch.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="shrink-0 text-brand-600" />
                    <span>{t('branchHoursValue')}</span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
