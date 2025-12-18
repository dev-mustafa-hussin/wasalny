import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | null;
}

// VAPID public key - this should be generated and stored securely
// For demo purposes, we'll use a placeholder
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}

export function usePushNotifications() {
  const { user } = useAuth();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    permission: null
  });
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
      const permission = 'Notification' in window ? Notification.permission : null;

      setState(prev => ({
        ...prev,
        isSupported,
        permission,
        isLoading: false
      }));

      if (isSupported) {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          setRegistration(reg);
          console.log('Service Worker registered:', reg);

          // Check existing subscription
          const subscription = await reg.pushManager.getSubscription();
          setState(prev => ({
            ...prev,
            isSubscribed: !!subscription
          }));
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    checkSupport();
  }, []);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!registration || !user) {
      toast.error('يرجى تسجيل الدخول أولاً');
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        toast.error('يرجى السماح بالإشعارات');
        setState(prev => ({ ...prev, isLoading: false }));
        return false;
      }

      // Subscribe to push manager
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      console.log('Push subscription:', subscription);

      // Save subscription to database
      const subscriptionJson = subscription.toJSON();
      
      // Store in localStorage for now (in production, save to database)
      localStorage.setItem('pushSubscription', JSON.stringify({
        endpoint: subscriptionJson.endpoint,
        keys: subscriptionJson.keys,
        userId: user.id
      }));

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false
      }));

      toast.success('تم تفعيل إشعارات Push بنجاح');
      return true;
    } catch (error) {
      console.error('Push subscription failed:', error);
      toast.error('فشل في تفعيل الإشعارات');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [registration, user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!registration) return false;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        localStorage.removeItem('pushSubscription');
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false
      }));

      toast.success('تم إلغاء تفعيل الإشعارات');
      return true;
    } catch (error) {
      console.error('Push unsubscription failed:', error);
      toast.error('فشل في إلغاء تفعيل الإشعارات');
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  }, [registration]);

  // Send a local notification (for testing)
  const sendLocalNotification = useCallback(async (title: string, body: string, data?: object) => {
    if (!registration) {
      toast.error('Service Worker غير مسجل');
      return;
    }

    if (Notification.permission !== 'granted') {
      toast.error('يرجى السماح بالإشعارات أولاً');
      return;
    }

    try {
      await registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'waslni-notification',
        data: data || {},
        dir: 'rtl',
        lang: 'ar'
      });
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, [registration]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendLocalNotification
  };
}
