import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Promotion } from '@/types';

async function fetchPromotions(): Promise<Promotion[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Promotion[];
}

export function usePromotionManagement() {
  return useQuery<Promotion[], Error>({
    queryKey: ['promotions', 'management'],
    queryFn: fetchPromotions,
  });
}

type CreatePromotionArgs = {
  title: string;
  description?: string;
  image_url?: string;
  banner_image?: string;
  product_id: number | null;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
};

async function createPromotion(args: CreatePromotionArgs) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { error } = await supabase.from('promotions').insert({
    title: args.title,
    description: args.description ?? null,
    image_url: args.image_url ?? null,
    banner_image: args.banner_image ?? null,
    product_id: args.product_id,
    discount_percent: args.discount_percent,
    starts_at: args.starts_at,
    ends_at: args.ends_at,
    is_active: true,
  });

  if (error) throw new Error(error.message);
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPromotion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });
}

type UpdatePromotionArgs = {
  id: number;
  title?: string;
  description?: string | null;
  image_url?: string | null;
  banner_image?: string | null;
  product_id?: number | null;
  discount_percent?: number;
  starts_at?: string;
  ends_at?: string;
  is_active?: boolean;
};

async function updatePromotion(args: UpdatePromotionArgs) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { id, ...updates } = args;
  const { error } = await supabase.from('promotions').update(updates).eq('id', id);

  if (error) throw new Error(error.message);
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePromotion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });
}

type DeletePromotionArgs = {
  id: number;
};

async function deletePromotion({ id }: DeletePromotionArgs) {
  if (!supabase) throw new Error('Supabase is not configured');

  const { error } = await supabase.from('promotions').delete().eq('id', id);

  if (error) throw new Error(error.message);
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] });
    },
  });
}
