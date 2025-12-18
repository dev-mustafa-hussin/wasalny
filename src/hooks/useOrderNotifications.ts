import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Generate notification sound using Web Audio API
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a sequence of tones for notification
    const playTone = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    // Pleasant notification melody
    playTone(523.25, now, 0.15); // C5
    playTone(659.25, now + 0.15, 0.15); // E5
    playTone(783.99, now + 0.3, 0.2); // G5
    
  } catch (e) {
    console.log('Audio not supported');
  }
};

export function useOrderNotifications() {
  const { userRole } = useAuth();

  const handleNewOrder = useCallback(async (payload: any) => {
    console.log('New order received:', payload);
    
    // Play notification sound
    playNotificationSound();
    
    // Fetch store name for the notification
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', payload.new.store_id)
      .maybeSingle();

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
  }, []);

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
        handleNewOrder
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, handleNewOrder]);
}
