import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Promotion } from '@/types';

async function fetchActivePromotions(): Promise<Promotion[]> {
  if (!supabase) return [];

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as Promotion[];
}

export function usePromotions() {
  return useQuery({
    queryKey: ['promotions'],
    queryFn: fetchActivePromotions,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
}

export function getProductPromotion(
  productId: number,
  category: string,
  promotions: Promotion[],
): Promotion | undefined {
  return promotions.find(
    (p) =>
      p.product_id === productId ||
      (p.category && p.category === category),
  );
}
