import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function formatCurrency(value: number, locale = 'en-RW') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'RWF',
    maximumFractionDigits: 0,
  }).format(value);
}

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export function haversineDistanceInKm(origin: Coordinates, target: { latitude: number; longitude: number }) {
  const earthRadiusKm = 6371;
  const dLat = (target.latitude - origin.latitude) * (Math.PI / 180);
  const dLon = (target.longitude - origin.longitude) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.latitude * (Math.PI / 180)) *
      Math.cos(target.latitude * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
