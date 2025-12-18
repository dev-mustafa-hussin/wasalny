import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseDriverGPSOptions {
  driverId: string;
  enabled?: boolean;
  updateIntervalMs?: number;
}

interface DriverLocation {
  lat: number;
  lng: number;
  timestamp: Date;
}

export function useDriverGPS({ 
  driverId, 
  enabled = true, 
  updateIntervalMs = 10000 // Update every 10 seconds
}: UseDriverGPSOptions) {
  const [location, setLocation] = useState<DriverLocation | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const updateDriverLocation = useCallback(async (lat: number, lng: number) => {
    try {
      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          current_lat: lat,
          current_lng: lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', driverId);

      if (updateError) throw updateError;

      setLocation({ lat, lng, timestamp: new Date() });
      console.log('Driver location updated:', { lat, lng });
    } catch (err) {
      console.error('Error updating driver location:', err);
      setError('فشل في تحديث الموقع');
    }
  }, [driverId]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('GPS غير متوفر في هذا المتصفح');
      toast.error('GPS غير متوفر في هذا المتصفح');
      return;
    }

    setIsTracking(true);
    setError(null);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateDriverLocation(latitude, longitude);
      },
      (err) => {
        console.error('Geolocation error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('يرجى السماح بالوصول للموقع');
            toast.error('يرجى السماح بالوصول للموقع');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('الموقع غير متوفر');
            break;
          case err.TIMEOUT:
            setError('انتهت مهلة طلب الموقع');
            break;
        }
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: updateIntervalMs
      }
    );

    setWatchId(id);
    toast.success('تم تفعيل تتبع الموقع');
  }, [updateDriverLocation, updateIntervalMs]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
    toast.info('تم إيقاف تتبع الموقع');
  }, [watchId]);

  // Auto-start tracking if enabled
  useEffect(() => {
    if (enabled && driverId && !isTracking) {
      // Don't auto-start, let the user control it
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled, driverId, watchId]);

  return {
    location,
    isTracking,
    error,
    startTracking,
    stopTracking
  };
}
