import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, MapPin, RefreshCw, TrendingUp, Filter, X, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderLocation {
  lat: number;
  lng: number;
  count: number;
}

interface HotZone {
  name: string;
  count: number;
  percentage: number;
}

interface StoreData {
  id: string;
  name: string;
}

const statusOptions = [
  { value: 'all', label: 'جميع الحالات' },
  { value: 'pending', label: 'معلق' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'preparing', label: 'قيد التحضير' },
  { value: 'out_for_delivery', label: 'في الطريق' },
  { value: 'delivered', label: 'تم التوصيل' },
  { value: 'cancelled', label: 'ملغي' },
];

export default function OrdersHeatmap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderLocations, setOrderLocations] = useState<OrderLocation[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [period, setPeriod] = useState('30');
  const [hotZones, setHotZones] = useState<HotZone[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Fetch Mapbox token and stores
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [tokenRes, storesRes] = await Promise.all([
          supabase.functions.invoke('get-mapbox-token'),
          supabase.from('stores').select('id, name')
        ]);
        
        if (tokenRes.error) throw tokenRes.error;
        if (tokenRes.data?.token) {
          setMapToken(tokenRes.data.token);
        } else {
          setError('لم يتم تكوين مفتاح Mapbox');
        }
        
        setStores(storesRes.data || []);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError('فشل في جلب البيانات');
      }
    };
    fetchInitialData();
  }, []);

  // Fetch orders with locations
  const fetchOrderLocations = async () => {
    setLoading(true);
    
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(period));
    
    let query = supabase
      .from('orders')
      .select('delivery_lat, delivery_lng, delivery_address, store_id, status')
      .not('delivery_lat', 'is', null)
      .not('delivery_lng', 'is', null)
      .gte('created_at', fromDate.toISOString());

    if (selectedStore !== 'all') {
      query = query.eq('store_id', selectedStore);
    }

    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      return;
    }

    // Group by approximate location (round to 3 decimal places ~111m precision)
    const locationMap: Record<string, { lat: number; lng: number; count: number; addresses: string[] }> = {};
    
    orders?.forEach(order => {
      if (order.delivery_lat && order.delivery_lng) {
        const key = `${Number(order.delivery_lat).toFixed(3)},${Number(order.delivery_lng).toFixed(3)}`;
        if (!locationMap[key]) {
          locationMap[key] = { 
            lat: Number(order.delivery_lat), 
            lng: Number(order.delivery_lng), 
            count: 0,
            addresses: []
          };
        }
        locationMap[key].count += 1;
        if (order.delivery_address && !locationMap[key].addresses.includes(order.delivery_address)) {
          locationMap[key].addresses.push(order.delivery_address);
        }
      }
    });

    const locations = Object.values(locationMap).map(loc => ({
      lat: loc.lat,
      lng: loc.lng,
      count: loc.count
    }));

    setOrderLocations(locations);
    setTotalOrders(orders?.length || 0);

    // Calculate hot zones (top 5 areas)
    const sortedLocations = [...Object.values(locationMap)]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalOrdersCount = orders?.length || 1;
    const zones = sortedLocations.map((loc, index) => ({
      name: loc.addresses[0]?.split(',')[0] || `منطقة ${index + 1}`,
      count: loc.count,
      percentage: (loc.count / totalOrdersCount) * 100
    }));

    setHotZones(zones);
    setLoading(false);
  };

  useEffect(() => {
    if (mapToken) {
      fetchOrderLocations();
    }
  }, [mapToken, period, selectedStore, selectedStatus]);

  const hasActiveFilters = selectedStore !== 'all' || selectedStatus !== 'all';

  const clearFilters = () => {
    setSelectedStore('all');
    setSelectedStatus('all');
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapToken || map.current) return;

    mapboxgl.accessToken = mapToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [46.6753, 24.7136], // Riyadh, Saudi Arabia
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      // Add empty source that will be updated
      map.current!.addSource('orders-heat', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });

      // Add heatmap layer
      map.current!.addLayer({
        id: 'orders-heat',
        type: 'heatmap',
        source: 'orders-heat',
        maxzoom: 15,
        paint: {
          // Increase weight based on order count
          'heatmap-weight': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            0, 0,
            10, 1
          ],
          // Increase intensity as zoom increases
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            15, 3
          ],
          // Color gradient
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(33,102,172,0)',
            0.2, 'rgb(103,169,207)',
            0.4, 'rgb(209,229,240)',
            0.6, 'rgb(253,219,199)',
            0.8, 'rgb(239,138,98)',
            1, 'rgb(178,24,43)'
          ],
          // Radius increases with zoom
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 15,
            15, 30
          ],
          // Opacity decreases as zoom increases
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            15, 0.6
          ]
        }
      });

      // Add circle layer for high zoom
      map.current!.addLayer({
        id: 'orders-point',
        type: 'circle',
        source: 'orders-heat',
        minzoom: 12,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, 8,
            10, 20
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, '#3b82f6',
            5, '#f59e0b',
            10, '#ef4444'
          ],
          'circle-stroke-color': 'white',
          'circle-stroke-width': 2,
          'circle-opacity': 0.8
        }
      });

      // Add popup on click
      map.current!.on('click', 'orders-point', (e) => {
        if (e.features && e.features[0]) {
          const count = e.features[0].properties?.count;
          const coordinates = (e.features[0].geometry as any).coordinates.slice();
          
          new mapboxgl.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div class="p-2 text-center" dir="rtl">
                <p class="font-bold text-lg">${count}</p>
                <p class="text-sm text-gray-600">طلب في هذه المنطقة</p>
              </div>
            `)
            .addTo(map.current!);
        }
      });

      map.current!.on('mouseenter', 'orders-point', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current!.on('mouseleave', 'orders-point', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapToken]);

  // Update heatmap data when orderLocations change
  useEffect(() => {
    if (!map.current || orderLocations.length === 0) return;

    const source = map.current.getSource('orders-heat') as mapboxgl.GeoJSONSource;
    if (!source) return;

    const features = orderLocations.map(loc => ({
      type: 'Feature' as const,
      properties: { count: loc.count },
      geometry: {
        type: 'Point' as const,
        coordinates: [loc.lng, loc.lat]
      }
    }));

    source.setData({
      type: 'FeatureCollection',
      features
    });

    // Fit bounds to show all orders
    if (orderLocations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      orderLocations.forEach(loc => {
        bounds.extend([loc.lng, loc.lat]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [orderLocations]);

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
          <Flame className="h-5 w-5 text-orange-500" />
          خريطة المناطق الأكثر نشاطاً
        </h2>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="gap-1">
            <MapPin className="h-3 w-3" />
            {totalOrders} طلب
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchOrderLocations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">فلترة:</span>
            </div>

            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-44">
                <Store className="h-4 w-4 ml-2" />
                <SelectValue placeholder="جميع المتاجر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المتاجر</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 ml-1" />
                مسح الفلاتر
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedStore !== 'all' && (
                <Badge variant="secondary">
                  المتجر: {stores.find(s => s.id === selectedStore)?.name}
                </Badge>
              )}
              {selectedStatus !== 'all' && (
                <Badge variant="secondary">
                  الحالة: {statusOptions.find(s => s.value === selectedStatus)?.label}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              المناطق الأكثر طلباً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  جاري التحميل...
                </p>
              ) : hotZones.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  لا توجد بيانات كافية
                </p>
              ) : (
                hotZones.map((zone, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate flex-1">
                        {index + 1}. {zone.name}
                      </span>
                      <Badge variant="secondary" className="ml-2">
                        {zone.count}
                      </Badge>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{ 
                          width: `${zone.percentage}%`,
                          background: `linear-gradient(90deg, hsl(var(--primary)), hsl(25, 95%, 53%))`
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {zone.percentage.toFixed(1)}% من إجمالي الطلبات
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs font-medium mb-3">مفتاح الألوان</p>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-3 rounded" style={{
                  background: 'linear-gradient(90deg, rgb(33,102,172), rgb(103,169,207), rgb(209,229,240), rgb(253,219,199), rgb(239,138,98), rgb(178,24,43))'
                }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>منخفض</span>
                <span>مرتفع</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
