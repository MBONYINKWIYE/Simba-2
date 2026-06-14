import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import type { ShopOrderStatus } from '@/types';

type UpdateOrderStatusArgs = {
  orderId: string;
  scopeKey: string;
  status: ShopOrderStatus;
  rejectionReason?: string;
};

type AssignOrderToStaffArgs = {
  orderId: string;
  scopeKey: string;
  staffUserId: string;
};

type AssignOrderToDeliveryArgs = {
  orderId: string;
  scopeKey: string;
  deliveryPersonId: string;
};

type RemoveDeliveryAssignmentArgs = {
  orderId: string;
  scopeKey: string;
};

async function updateOrderStatus({ orderId, status, rejectionReason }: UpdateOrderStatusArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('update_shop_order_status', {
    target_order_id: orderId,
    next_status: status,
    rejection_note: status === 'rejected' ? rejectionReason ?? null : null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function assignOrderToDelivery({ orderId, deliveryPersonId }: AssignOrderToDeliveryArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('assign_order_to_delivery', {
    target_order_id: orderId,
    target_delivery_person_id: deliveryPersonId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function removeDeliveryAssignment({ orderId }: RemoveDeliveryAssignmentArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('remove_order_delivery_assignment', {
    target_order_id: orderId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function assignOrderToStaff({ orderId, staffUserId }: AssignOrderToStaffArgs) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  const { error } = await supabase.rpc('assign_order_to_staff', {
    target_order_id: orderId,
    target_staff_user_id: staffUserId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders(variables.scopeKey) }),
        queryClient.invalidateQueries({ queryKey: ['orders'] }),
      ]);
    },
  });
}

export function useAssignOrderToDelivery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignOrderToDelivery,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders(variables.scopeKey) }),
        queryClient.invalidateQueries({ queryKey: ['delivery-persons'] }),
      ]);
    },
  });
}

export function useRemoveDeliveryAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeDeliveryAssignment,
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders(variables.scopeKey) });
    },
  });
}

export function useAssignOrderToStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignOrderToStaff,
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminOrders(variables.scopeKey) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.shopAdmins }),
      ]);
    },
  });
}
