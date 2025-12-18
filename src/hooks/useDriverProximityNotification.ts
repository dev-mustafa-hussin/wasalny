import { useEffect, useRef, useCallback } from 'react';

interface NotificationThreshold {
  distance: number; // in meters
  message: string;
  played: boolean;
}

export function useDriverProximityNotification(
  driverLat: number | null | undefined,
  driverLng: number | null | undefined,
  deliveryLat: number | null | undefined,
  deliveryLng: number | null | undefined,
  enabled: boolean = true
) {
  const thresholdsRef = useRef<NotificationThreshold[]>([
    { distance: 1000, message: 'المندوب على بعد 1 كم منك', played: false },
    { distance: 500, message: 'المندوب على بعد 500 متر منك', played: false },
    { distance: 200, message: 'المندوب وصل تقريباً!', played: false },
  ]);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = useCallback((
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback((frequency: number = 800, duration: number = 300) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);

      // Play second beep for urgency
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.frequency.value = frequency * 1.2;
        osc2.type = 'sine';

        gain2.gain.setValueAtTime(0.3, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + duration / 1000);
      }, 150);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('وصلني - تتبع الطلب', {
        body: message,
        icon: '/favicon.ico',
        tag: 'driver-proximity'
      });
    }
  }, []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Check distance and trigger notifications
  useEffect(() => {
    if (!enabled || !driverLat || !driverLng || !deliveryLat || !deliveryLng) {
      return;
    }

    const distance = calculateDistance(driverLat, driverLng, deliveryLat, deliveryLng);
    console.log('Driver distance:', distance, 'meters');

    thresholdsRef.current.forEach((threshold, index) => {
      if (distance <= threshold.distance && !threshold.played) {
        // Mark as played
        thresholdsRef.current[index].played = true;

        // Play sound based on urgency
        const frequency = index === 2 ? 1000 : index === 1 ? 900 : 800;
        playNotificationSound(frequency, index === 2 ? 500 : 300);

        // Show browser notification
        showBrowserNotification(threshold.message);

        console.log('Proximity notification:', threshold.message);
      }
    });
  }, [driverLat, driverLng, deliveryLat, deliveryLng, enabled, calculateDistance, playNotificationSound, showBrowserNotification]);

  // Reset thresholds when component unmounts or order changes
  const resetThresholds = useCallback(() => {
    thresholdsRef.current = thresholdsRef.current.map(t => ({ ...t, played: false }));
  }, []);

  return { resetThresholds };
}
