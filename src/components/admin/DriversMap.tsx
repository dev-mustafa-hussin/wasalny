import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Driver {
  id: string;
  user_id: string;
  current_lat: number | null;
  current_lng: number | null;
  is_available: boolean | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  profile?: {
    full_name: string;
  };
}

export default function DriversMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapToken(data.token);
        } else {
          setError('لم يتم تكوين مفتاح Mapbox');
        }
      } catch (err: any) {
        console.error('Error fetching Mapbox token:', err);
        setError('فشل في جلب مفتاح الخريطة');
      }
    };
    fetchToken();
  }, []);

  // Fetch drivers with profiles
  const fetchDrivers = async () => {
    setLoading(true);
    const { data: driversData, error } = await supabase
      .from('drivers')
      .select('*');

    if (error) {
      console.error('Error fetching drivers:', error);
      setLoading(false);
      return;
    }

    // Fetch profiles for drivers
    const driverUserIds = driversData?.map(d => d.user_id) || [];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', driverUserIds);

    const driversWithProfiles = driversData?.map(driver => ({
      ...driver,
      profile: profilesData?.find(p => p.user_id === driver.user_id),
    })) || [];

    setDrivers(driversWithProfiles);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('drivers-location')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'drivers',
        },
        (payload) => {
          console.log('Driver location updated:', payload);
          setDrivers(prev => prev.map(d => 
            d.id === payload.new.id ? { ...d, ...payload.new } : d
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapToken || map.current) return;

    mapboxgl.accessToken = mapToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [46.6753, 24.7136], // Riyadh, Saudi Arabia
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapToken]);

  // Update markers when drivers change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Add new markers
    drivers.forEach(driver => {
      if (driver.current_lat && driver.current_lng) {
        const el = document.createElement('div');
        el.className = 'driver-marker';
        el.innerHTML = `
          <div class="relative">
            <div class="w-10 h-10 rounded-full ${driver.is_available ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center shadow-lg border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            ${driver.is_available ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>' : ''}
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 text-right" dir="rtl">
            <p class="font-bold">${driver.profile?.full_name || 'مندوب'}</p>
            <p class="text-sm text-gray-600">${driver.vehicle_type || 'غير محدد'} - ${driver.vehicle_number || ''}</p>
            <p class="text-sm ${driver.is_available ? 'text-green-600' : 'text-gray-500'}">
              ${driver.is_available ? '✓ متاح' : '✗ غير متاح'}
            </p>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([driver.current_lng, driver.current_lat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current[driver.id] = marker;
      }
    });

    // Fit bounds if we have markers
    const driversWithLocation = drivers.filter(d => d.current_lat && d.current_lng);
    if (driversWithLocation.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      driversWithLocation.forEach(d => {
        bounds.extend([d.current_lng!, d.current_lat!]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [drivers, mapToken]);

  const availableCount = drivers.filter(d => d.is_available).length;
  const driversWithLocation = drivers.filter(d => d.current_lat && d.current_lng);

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          تتبع المندوبين
        </h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            {drivers.length} مندوب
          </Badge>
          <Badge variant={availableCount > 0 ? "default" : "secondary"} className="gap-1">
            {availableCount} متاح
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchDrivers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <CardContent className="p-0">
            <div 
              ref={mapContainer} 
              className="h-[500px] rounded-lg overflow-hidden"
              style={{ minHeight: '500px' }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المندوبين النشطين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {drivers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا يوجد مندوبين
                </p>
              ) : (
                drivers.map(driver => (
                  <div 
                    key={driver.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (driver.current_lat && driver.current_lng && map.current) {
                        map.current.flyTo({
                          center: [driver.current_lng, driver.current_lat],
                          zoom: 15,
                        });
                        markersRef.current[driver.id]?.togglePopup();
                      }
                    }}
                  >
                    <div className={`w-3 h-3 rounded-full ${driver.is_available ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {driver.profile?.full_name || 'مندوب'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {driver.vehicle_type || 'غير محدد'}
                      </p>
                    </div>
                    {driver.current_lat && driver.current_lng ? (
                      <MapPin className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="text-xs text-muted-foreground">لا موقع</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {driversWithLocation.length === 0 && drivers.length > 0 && (
        <Card className="bg-warning/10 border-warning/30">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-warning">
              لا يوجد مندوبين لديهم موقع محدد. سيظهر المندوبين على الخريطة عند تحديث مواقعهم.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
