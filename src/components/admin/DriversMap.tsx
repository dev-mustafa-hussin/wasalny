import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, User, RefreshCw, Route, X } from 'lucide-react';
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
  activeOrder?: {
    id: string;
    delivery_address: string;
    delivery_lat: number | null;
    delivery_lng: number | null;
  };
}

interface RouteInfo {
  driverId: string;
  distance: number; // km
  duration: number; // minutes
}

export default function DriversMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const destinationMarkersRef = useRef<Record<string, mapboxgl.Marker>>({});
  
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRoutes, setActiveRoutes] = useState<Record<string, RouteInfo>>({});
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

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

  // Fetch drivers with profiles and active orders
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

    // Fetch active orders for drivers
    const driverIds = driversData?.map(d => d.id) || [];
    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, driver_id, delivery_address, delivery_lat, delivery_lng')
      .in('driver_id', driverIds)
      .in('status', ['out_for_delivery', 'picked_up']);

    const driversWithProfiles = driversData?.map(driver => ({
      ...driver,
      profile: profilesData?.find(p => p.user_id === driver.user_id),
      activeOrder: ordersData?.find(o => o.driver_id === driver.id),
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

  // Fetch route from Mapbox Directions API
  const fetchRoute = useCallback(async (
    driverId: string,
    startLng: number,
    startLat: number,
    endLng: number,
    endLat: number
  ) => {
    if (!mapToken || !map.current) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${mapToken}`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const routeId = `route-${driverId}`;

        // Remove existing route if any
        if (map.current.getSource(routeId)) {
          map.current.removeLayer(routeId);
          map.current.removeSource(routeId);
        }

        // Add route to map
        map.current.addSource(routeId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: route.geometry,
          },
        });

        map.current.addLayer({
          id: routeId,
          type: 'line',
          source: routeId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 5,
            'line-opacity': 0.8,
          },
        });

        // Store route info
        setActiveRoutes(prev => ({
          ...prev,
          [driverId]: {
            driverId,
            distance: route.distance / 1000, // Convert to km
            duration: route.duration / 60, // Convert to minutes
          },
        }));

        // Fit bounds to show entire route
        const coordinates = route.geometry.coordinates;
        const bounds = coordinates.reduce(
          (bounds: mapboxgl.LngLatBounds, coord: [number, number]) => bounds.extend(coord),
          new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
        );
        map.current.fitBounds(bounds, { padding: 80 });
      }
    } catch (err) {
      console.error('Error fetching route:', err);
    }
  }, [mapToken]);

  // Clear route from map
  const clearRoute = useCallback((driverId: string) => {
    if (!map.current) return;

    const routeId = `route-${driverId}`;
    if (map.current.getSource(routeId)) {
      map.current.removeLayer(routeId);
      map.current.removeSource(routeId);
    }

    // Remove destination marker
    if (destinationMarkersRef.current[driverId]) {
      destinationMarkersRef.current[driverId].remove();
      delete destinationMarkersRef.current[driverId];
    }

    setActiveRoutes(prev => {
      const newRoutes = { ...prev };
      delete newRoutes[driverId];
      return newRoutes;
    });

    setSelectedDriver(null);
  }, []);

  // Show route for driver
  const showRoute = useCallback((driver: Driver) => {
    if (!driver.current_lat || !driver.current_lng || !driver.activeOrder?.delivery_lat || !driver.activeOrder?.delivery_lng) {
      return;
    }

    setSelectedDriver(driver.id);

    // Add destination marker
    if (map.current) {
      // Remove existing destination marker
      if (destinationMarkersRef.current[driver.id]) {
        destinationMarkersRef.current[driver.id].remove();
      }

      const el = document.createElement('div');
      el.innerHTML = `
        <div class="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2 text-right" dir="rtl">
          <p class="font-bold text-red-600">موقع التوصيل</p>
          <p class="text-sm text-gray-600">${driver.activeOrder.delivery_address}</p>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([driver.activeOrder.delivery_lng, driver.activeOrder.delivery_lat])
        .setPopup(popup)
        .addTo(map.current);

      destinationMarkersRef.current[driver.id] = marker;
    }

    fetchRoute(
      driver.id,
      driver.current_lng,
      driver.current_lat,
      driver.activeOrder.delivery_lng,
      driver.activeOrder.delivery_lat
    );
  }, [fetchRoute]);

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
        const hasActiveOrder = !!driver.activeOrder;
        el.innerHTML = `
          <div class="relative">
            <div class="w-10 h-10 rounded-full ${hasActiveOrder ? 'bg-blue-500' : driver.is_available ? 'bg-green-500' : 'bg-gray-400'} flex items-center justify-center shadow-lg border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            ${hasActiveOrder ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>' : driver.is_available ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>' : ''}
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 text-right" dir="rtl">
            <p class="font-bold">${driver.profile?.full_name || 'مندوب'}</p>
            <p class="text-sm text-gray-600">${driver.vehicle_type || 'غير محدد'} - ${driver.vehicle_number || ''}</p>
            <p class="text-sm ${hasActiveOrder ? 'text-blue-600' : driver.is_available ? 'text-green-600' : 'text-gray-500'}">
              ${hasActiveOrder ? '🚗 في مهمة توصيل' : driver.is_available ? '✓ متاح' : '✗ غير متاح'}
            </p>
            ${hasActiveOrder ? `<p class="text-xs text-gray-500 mt-1">${driver.activeOrder?.delivery_address || ''}</p>` : ''}
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
    if (driversWithLocation.length > 0 && map.current && !selectedDriver) {
      const bounds = new mapboxgl.LngLatBounds();
      driversWithLocation.forEach(d => {
        bounds.extend([d.current_lng!, d.current_lat!]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [drivers, mapToken, selectedDriver]);

  const availableCount = drivers.filter(d => d.is_available).length;
  const driversWithLocation = drivers.filter(d => d.current_lat && d.current_lng);
  const driversWithOrders = drivers.filter(d => d.activeOrder);

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          تتبع المندوبين
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <User className="h-3 w-3" />
            {drivers.length} مندوب
          </Badge>
          <Badge variant={availableCount > 0 ? "default" : "secondary"} className="gap-1">
            {availableCount} متاح
          </Badge>
          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
            <Route className="h-3 w-3" />
            {driversWithOrders.length} في مهمة
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchDrivers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Route Info Banner */}
      {selectedDriver && activeRoutes[selectedDriver] && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Route className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  المسافة: {activeRoutes[selectedDriver].distance.toFixed(1)} كم
                </p>
                <p className="text-sm text-blue-700">
                  الوقت المتوقع: {Math.round(activeRoutes[selectedDriver].duration)} دقيقة
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => clearRoute(selectedDriver)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

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
                    className={`flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors ${selectedDriver === driver.id ? 'bg-blue-50 border border-blue-200' : ''}`}
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
                    <div className={`w-3 h-3 rounded-full ${driver.activeOrder ? 'bg-blue-500' : driver.is_available ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {driver.profile?.full_name || 'مندوب'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {driver.vehicle_type || 'غير محدد'}
                      </p>
                    </div>
                    {driver.activeOrder && driver.current_lat && driver.current_lng && driver.activeOrder.delivery_lat && driver.activeOrder.delivery_lng ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (selectedDriver === driver.id) {
                            clearRoute(driver.id);
                          } else {
                            showRoute(driver);
                          }
                        }}
                      >
                        <Route className={`h-4 w-4 ${selectedDriver === driver.id ? 'text-blue-600' : 'text-muted-foreground'}`} />
                      </Button>
                    ) : driver.current_lat && driver.current_lng ? (
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
