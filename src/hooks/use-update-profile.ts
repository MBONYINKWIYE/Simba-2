import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/query-keys';

export type ProfileUpdateValues = {
  fullName: string;
  phone: string;
};

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ProfileUpdateValues) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: values.fullName,
          phone: values.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      // Invalidate queries that might be using profile data if any
      // For now, we don't have a specific profile query, but we can invalidate orders as they might show user info
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
    },
  });
}
