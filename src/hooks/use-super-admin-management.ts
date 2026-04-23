import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';

type CreateShopArgs = {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
};

type AssignShopAdminArgs = {
  adminEmail: string;
  shopId: string;
  role: 'admin' | 'manager' | 'staff';
};

async function createShop(args: CreateShopArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('create_shop', {
    shop_name: args.name,
    shop_address: args.address,
    shop_latitude: args.latitude,
    shop_longitude: args.longitude,
    shop_phone: args.phone,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function assignShopAdmin(args: AssignShopAdminArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('assign_shop_admin', {
    admin_email: args.adminEmail,
    target_shop_id: args.shopId,
    admin_role: args.role,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function useCreateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createShop,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.shops });
    },
  });
}

export function useAssignShopAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignShopAdmin,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.shopAdmins }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shops }),
      ]);
    },
  });
}
