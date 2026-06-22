import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

async function fetchNotifications(userId: string): Promise<NotificationRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return (data ?? []) as NotificationRecord[];
}

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: Boolean(userId && supabase),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!userId || !supabase) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRecord>) => {
          queryClient.setQueryData<NotificationRecord[]>(
            ['notifications', userId],
            (old) => (old ? [payload.new as NotificationRecord, ...old] : [payload.new as NotificationRecord]),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_data, notificationId) => {
      queryClient.setQueriesData<NotificationRecord[]>(
        { queryKey: ['notifications'] },
        (old) =>
          old?.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          ),
      );
    },
  });
}

export function useCancelRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase.rpc('cancel_order_recurrence', {
        p_order_id: orderId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
