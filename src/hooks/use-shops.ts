import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { Shop } from '@/types';
import { haversineDistanceInKm, type Coordinates } from '@/lib/utils';

async function fetchShops(): Promise<Shop[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('shops')
    .select('id, name, address, latitude, longitude, phone, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Shop[];
}

export function useShops() {
  return useQuery({
    queryKey: queryKeys.shops,
    queryFn: fetchShops,
    staleTime: 1000 * 60 * 10,
  });
}

export function useNearestShop() {
  const { data: shops } = useShops();
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [nearestShop, setNearestShop] = useState<Shop | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => console.warn('Geolocation permission denied'),
      { enableHighAccuracy: true }
    );
  }, []);

  useEffect(() => {
    if (!coords || !shops || shops.length === 0) return;

    const ranked = [...shops].sort((a, b) => {
      const distA = haversineDistanceInKm(coords, a);
      const distB = haversineDistanceInKm(coords, b);
      return distA - distB;
    });

    setNearestShop(ranked[0]);
  }, [coords, shops]);

  return { nearestShop, coords };
}
