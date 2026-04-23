import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { ReviewRecord, ShopReviewSummary } from '@/types';

type CreateReviewArgs = {
  orderId: string;
  rating: number;
  comment: string;
};

async function fetchUserReviews(): Promise<ReviewRecord[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('id, order_id, user_id, shop_id, rating, comment, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ReviewRecord[];
}

async function fetchShopReviewSummary(): Promise<ShopReviewSummary[]> {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase.rpc('list_shop_review_summary');

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ShopReviewSummary[]).map((entry) => ({
    ...entry,
    average_rating: Number(entry.average_rating ?? 0),
  }));
}

async function createReview({ orderId, rating, comment }: CreateReviewArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('create_review', {
    p_order_id: orderId,
    p_rating: rating,
    p_comment: comment,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function useReviews(userId: string | null) {
  return useQuery({
    queryKey: queryKeys.reviews(userId ?? 'guest'),
    queryFn: fetchUserReviews,
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });
}

export function useShopReviewSummary() {
  return useQuery({
    queryKey: queryKeys.shopReviewSummary,
    queryFn: fetchShopReviewSummary,
    staleTime: 1000 * 60,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReview,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shopReviewSummary }),
        queryClient.invalidateQueries({ queryKey: ['available-shops'] }),
      ]);
    },
  });
}
