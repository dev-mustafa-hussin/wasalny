import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Navigation, Loader2, Bell, Volume2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDriverProximityNotification } from '@/hooks/useDriverProximityNotification';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ETACardProps {
  orderId: string;
  orderStatus: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  driverId?: string | null;
}

interface DriverLocation {
  current_lat: number | null;
  current_lng: number | null;
}

export function ETACard({ orderId, orderStatus, deliveryLat, deliveryLng, driverId }: ETACardProps) {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [eta, setEta] = useState<{ distance: string; duration: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Only show for out_for_delivery status
  const showETA = orderStatus === 'out_for_delivery' && driverId && deliveryLat && deliveryLng;

  // Use proximity notifications hook
  useDriverProximityNotification(
    driverLocation?.current_lat,
    driverLocation?.current_lng,
    deliveryLat,
    deliveryLng,
    showETA && notificationsEnabled
  );

  const enableNotifications = async () => {
    try {
      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationsEnabled(true);
          toast.success('تم تفعيل الإشعارات الصوتية');
        } else {
          toast.error('يرجى السماح بالإشعارات لتلقي تنبيهات الاقتراب');
        }
      } else {
        setNotificationsEnabled(true);
        toast.success('تم تفعيل الإشعارات الصوتية');
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      setNotificationsEnabled(true);
    }
  };

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
      }
    };
    if (showETA) {
      fetchToken();
    }
  }, [showETA]);

  // Subscribe to driver location updates
  useEffect(() => {
    if (!driverId || !showETA) return;

    // Fetch initial driver location
    const fetchDriverLocation = async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('current_lat, current_lng')
        .eq('id', driverId)
        .single();

      if (!error && data) {
        setDriverLocation(data);
      }
    };

    fetchDriverLocation();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`driver-location-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
          filter: `id=eq.${driverId}`,
        },
        (payload) => {
          const newLocation = payload.new as DriverLocation;
          setDriverLocation({
            current_lat: newLocation.current_lat,
            current_lng: newLocation.current_lng
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, showETA]);

  // Calculate ETA when driver location or delivery location changes
  useEffect(() => {
    const calculateETA = async () => {
      if (!mapboxToken || !driverLocation?.current_lat || !driverLocation?.current_lng || !deliveryLat || !deliveryLng) {
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${driverLocation.current_lng},${driverLocation.current_lat};${deliveryLng},${deliveryLat}?access_token=${mapboxToken}&overview=false`
        );

        if (!response.ok) throw new Error('Failed to fetch route');

        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const distanceKm = (route.distance / 1000).toFixed(1);
          const durationMin = Math.ceil(route.duration / 60);

          setEta({
            distance: `${distanceKm} كم`,
            duration: durationMin <= 1 ? 'أقل من دقيقة' : `${durationMin} دقيقة`
          });
        }
      } catch (err) {
        console.error('Error calculating ETA:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (showETA) {
      calculateETA();
    }
  }, [mapboxToken, driverLocation, deliveryLat, deliveryLng, showETA]);

  if (!showETA) return null;

  if (!driverLocation?.current_lat || !driverLocation?.current_lng) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>في انتظار موقع المندوب...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Navigation className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-medium">المندوب في الطريق إليك</p>
              {isLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  جاري حساب الوقت...
                </p>
              ) : eta ? (
                <p className="text-sm text-muted-foreground">
                  المسافة: {eta.distance}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!notificationsEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={enableNotifications}
                className="flex items-center gap-1"
              >
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">تفعيل التنبيهات</span>
              </Button>
            ) : (
              <div className="flex items-center gap-1 text-green-600 text-sm">
                <Volume2 className="h-4 w-4" />
                <span className="hidden sm:inline">التنبيهات مفعّلة</span>
              </div>
            )}
            {eta && !isLoading && (
              <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full">
                <Clock className="h-4 w-4" />
                <span className="font-bold">{eta.duration}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
