import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function useOrderNotifications() {
  const { userRole } = useAuth();

  useEffect(() => {
    // Only subscribe for admin users
    if (userRole !== 'admin') return;

    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          console.log('New order received:', payload);
          
          // Fetch store name for the notification
          const { data: store } = await supabase
            .from('stores')
            .select('name')
            .eq('id', payload.new.store_id)
            .single();

          const storeName = store?.name || 'متجر';
          const amount = Number(payload.new.total_amount).toFixed(2);

          toast.success('طلب جديد!', {
            description: `طلب جديد من ${storeName} بقيمة ${amount} ر.س`,
            duration: 10000,
            action: {
              label: 'عرض الطلبات',
              onClick: () => {
                window.location.href = '/admin/orders';
              },
            },
          });

          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
              // Ignore audio play errors (e.g., user hasn't interacted with page)
            });
          } catch (e) {
            // Ignore audio errors
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole]);
}
