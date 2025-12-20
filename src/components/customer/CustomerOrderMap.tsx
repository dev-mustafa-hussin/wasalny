import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Navigation } from 'lucide-react';

interface CustomerOrderMapProps {
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

export function CustomerOrderMap({ orderId, orderStatus, deliveryLat, deliveryLng, driverId }: CustomerOrderMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);

  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Only show map for out_for_delivery status
  const showMap = orderStatus === 'out_for_delivery' && driverId && deliveryLat && deliveryLng;

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
    if (showMap) {
      fetchToken();
    }
  }, [showMap]);

  // Fetch driver location and subscribe to updates
  useEffect(() => {
    if (!driverId || !showMap) return;

    const fetchDriverLocation = async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('current_lat, current_lng')
        .eq('id', driverId)
        .single();

      if (!error && data) {
        setDriverLocation(data);
      }
      setIsLoading(false);
    };

    fetchDriverLocation();

    const channel = supabase
      .channel(`driver-map-${driverId}`)
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
  }, [driverId, showMap]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !showMap) return;

    mapboxgl.accessToken = mapboxToken;

    const centerLat = driverLocation?.current_lat || deliveryLat || 24.7136;
    const centerLng = driverLocation?.current_lng || deliveryLng || 46.6753;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [centerLng, centerLat],
      zoom: 14,
      attributionControl: false
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left');

    // Add delivery marker
    if (deliveryLat && deliveryLng) {
      const deliveryEl = document.createElement('div');
      deliveryEl.innerHTML = `
        <div style="
          background: hsl(var(--primary));
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          border: 3px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      deliveryMarker.current = new mapboxgl.Marker({ element: deliveryEl })
        .setLngLat([deliveryLng, deliveryLat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<div style="padding: 8px; font-weight: bold;">موقع التوصيل</div>'))
        .addTo(map.current);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, showMap, deliveryLat, deliveryLng]);

  // Update driver marker
  useEffect(() => {
    if (!map.current || !driverLocation?.current_lat || !driverLocation?.current_lng) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([driverLocation.current_lng, driverLocation.current_lat]);
    } else {
      const driverEl = document.createElement('div');
      driverEl.innerHTML = `
        <div style="
          background: #22c55e;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
          border: 3px solid white;
          animation: pulse 2s infinite;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/>
          </svg>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>
      `;

      driverMarker.current = new mapboxgl.Marker({ element: driverEl })
        .setLngLat([driverLocation.current_lng, driverLocation.current_lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML('<div style="padding: 8px; font-weight: bold;">موقع المندوب</div>'))
        .addTo(map.current);
    }

    // Draw route
    if (deliveryLat && deliveryLng && mapboxToken) {
      drawRoute(
        driverLocation.current_lng,
        driverLocation.current_lat,
        deliveryLng,
        deliveryLat
      );
    }

    // Fit bounds to show both markers
    if (deliveryLat && deliveryLng) {
      const bounds = new mapboxgl.LngLatBounds()
        .extend([driverLocation.current_lng, driverLocation.current_lat])
        .extend([deliveryLng, deliveryLat]);

      map.current.fitBounds(bounds, { padding: 60 });
    }
  }, [driverLocation, deliveryLat, deliveryLng, mapboxToken]);

  const drawRoute = async (startLng: number, startLat: number, endLng: number, endLat: number) => {
    if (!map.current || !mapboxToken) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&access_token=${mapboxToken}`
      );

      if (!response.ok) return;

      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0].geometry;

        if (map.current.getSource('route')) {
          (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData({
            type: 'Feature',
            properties: {},
            geometry: route
          });
        } else {
          map.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: route
            }
          });

          map.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#22c55e',
              'line-width': 5,
              'line-opacity': 0.8
            }
          });
        }
      }
    } catch (err) {
      console.error('Error drawing route:', err);
    }
  };

  if (!showMap) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          تتبع المندوب على الخريطة
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-b-lg" />
        ) : !driverLocation?.current_lat || !driverLocation?.current_lng ? (
          <div className="h-[300px] flex items-center justify-center bg-muted/50 rounded-b-lg">
            <div className="text-center text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>في انتظار موقع المندوب...</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="h-[300px] w-full rounded-b-lg" />
        )}
        
        {/* Legend */}
        <div className="p-3 border-t flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>المندوب</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-primary" />
            <span>موقع التوصيل</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
