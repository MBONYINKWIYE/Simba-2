import type { Locale } from '@/types';

export const DELIVERY_FEE = 2500;
export const SERVICE_FEE = 700;

export const FEATURED_CATEGORY_ART = [
  {
    key: 'fresh-picks',
    title: {
      en: 'Fresh picks',
      fr: 'Produits frais',
      rw: 'Ibyatoranyijwe bishya',
    } satisfies Record<Locale, string>,
    image:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'pantry',
    title: {
      en: 'Pantry staples',
      fr: 'Essentiels du placard',
      rw: 'Ibiribwa byo mu bubiko',
    } satisfies Record<Locale, string>,
    image:
      'https://images.unsplash.com/photo-1514995669114-6081e934b693?auto=format&fit=crop&w=900&q=80',
  },
  {
    key: 'household',
    title: {
      en: 'Home care',
      fr: 'Maison',
      rw: 'Ibikoresho byo mu rugo',
    } satisfies Record<Locale, string>,
    image:
      'https://images.pexels.com/photos/4239091/pexels-photo-4239091.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
];

export const LANGUAGES: { label: string; value: Locale }[] = [
  { label: 'EN', value: 'en' },
  { label: 'FR', value: 'fr' },
  { label: 'RW', value: 'rw' },
];

export const DEFAULT_CHECKOUT_VALUES = {
  fullName: '',
  phone: '',
  address: '',
  notes: '',
  paymentMethod: 'momo',
} as const;
