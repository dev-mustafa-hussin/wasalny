import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, MapPin, RefreshCw, TrendingUp, TrendingDown, Filter, X, Store, GitCompare, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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

interface ComparisonStats {
  period1Orders: number;
  period2Orders: number;
  change: number;
  changePercent: number;
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

const periodOptions = [
  { value: '7', label: 'آخر 7 أيام' },
  { value: '30', label: 'آخر 30 يوم' },
  { value: '90', label: 'آخر 90 يوم' },
];

export default function OrdersHeatmap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const comparisonMapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const comparisonMap = useRef<mapboxgl.Map | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [orderLocations, setOrderLocations] = useState<OrderLocation[]>([]);
  const [comparisonLocations, setComparisonLocations] = useState<OrderLocation[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [period, setPeriod] = useState('30');
  const [comparisonPeriod, setComparisonPeriod] = useState('30');
  const [hotZones, setHotZones] = useState<HotZone[]>([]);
  const [comparisonHotZones, setComparisonHotZones] = useState<HotZone[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [comparisonStats, setComparisonStats] = useState<ComparisonStats | null>(null);

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

  // Helper function to process orders into locations
  const processOrdersToLocations = (orders: any[]) => {
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

    const totalOrdersCount = orders?.length || 1;
    const zones = [...Object.values(locationMap)]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((loc, index) => ({
        name: loc.addresses[0]?.split(',')[0] || `منطقة ${index + 1}`,
        count: loc.count,
        percentage: (loc.count / totalOrdersCount) * 100
      }));

    return { locations, zones, total: orders?.length || 0 };
  };

  // Fetch orders for a specific period
  const fetchOrdersForPeriod = async (periodDays: number, offsetDays: number = 0) => {
    const toDate = new Date();
    toDate.setDate(toDate.getDate() - offsetDays);
    
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - periodDays);
    
    let query = supabase
      .from('orders')
      .select('delivery_lat, delivery_lng, delivery_address, store_id, status')
      .not('delivery_lat', 'is', null)
      .not('delivery_lng', 'is', null)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (selectedStore !== 'all') {
      query = query.eq('store_id', selectedStore);
    }

    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus);
    }

    const { data: orders, error } = await query;
    
    if (error) {
      console.error('Error fetching orders:', error);
      return null;
    }

    return orders;
  };

  // Fetch orders with locations
  const fetchOrderLocations = useCallback(async () => {
    setLoading(true);
    
    const periodDays = parseInt(period);
    const orders = await fetchOrdersForPeriod(periodDays);

    if (!orders) {
      setLoading(false);
      return;
    }

    const result = processOrdersToLocations(orders);
    setOrderLocations(result.locations);
    setTotalOrders(result.total);
    setHotZones(result.zones);

    // If comparison mode is enabled, fetch comparison data
    if (comparisonMode) {
      const compPeriodDays = parseInt(comparisonPeriod);
      // Get orders from the previous period (offset by current period days)
      const compOrders = await fetchOrdersForPeriod(compPeriodDays, periodDays);
      
      if (compOrders) {
        const compResult = processOrdersToLocations(compOrders);
        setComparisonLocations(compResult.locations);
        setComparisonHotZones(compResult.zones);

        // Calculate comparison stats
        const change = result.total - compResult.total;
        const changePercent = compResult.total > 0 
          ? ((result.total - compResult.total) / compResult.total) * 100 
          : 0;

        setComparisonStats({
          period1Orders: result.total,
          period2Orders: compResult.total,
          change,
          changePercent
        });
      }
    } else {
      setComparisonLocations([]);
      setComparisonHotZones([]);
      setComparisonStats(null);
    }

    setLoading(false);
  }, [period, comparisonPeriod, selectedStore, selectedStatus, comparisonMode]);

  useEffect(() => {
    if (mapToken) {
      fetchOrderLocations();
    }
  }, [mapToken, fetchOrderLocations]);

  const hasActiveFilters = selectedStore !== 'all' || selectedStatus !== 'all';

  const clearFilters = () => {
    setSelectedStore('all');
    setSelectedStatus('all');
  };

  // Initialize heatmap layers for a map
  const initializeHeatmapLayers = (mapInstance: mapboxgl.Map, sourceId: string) => {
    mapInstance.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: []
      }
    });

    mapInstance.addLayer({
      id: `${sourceId}-heat`,
      type: 'heatmap',
      source: sourceId,
      maxzoom: 15,
      paint: {
        'heatmap-weight': ['interpolate', ['linear'], ['get', 'count'], 0, 0, 10, 1],
        'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
        'heatmap-color': [
          'interpolate', ['linear'], ['heatmap-density'],
          0, 'rgba(33,102,172,0)',
          0.2, 'rgb(103,169,207)',
          0.4, 'rgb(209,229,240)',
          0.6, 'rgb(253,219,199)',
          0.8, 'rgb(239,138,98)',
          1, 'rgb(178,24,43)'
        ],
        'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 15, 15, 30],
        'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 15, 0.6]
      }
    });

    mapInstance.addLayer({
      id: `${sourceId}-point`,
      type: 'circle',
      source: sourceId,
      minzoom: 12,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['get', 'count'], 1, 8, 10, 20],
        'circle-color': ['interpolate', ['linear'], ['get', 'count'], 1, '#3b82f6', 5, '#f59e0b', 10, '#ef4444'],
        'circle-stroke-color': 'white',
        'circle-stroke-width': 2,
        'circle-opacity': 0.8
      }
    });
  };

  // Initialize main map
  useEffect(() => {
    if (!mapContainer.current || !mapToken || map.current) return;

    mapboxgl.accessToken = mapToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [46.6753, 24.7136],
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      initializeHeatmapLayers(map.current!, 'orders-heat');
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapToken]);

  // Initialize comparison map
  useEffect(() => {
    if (!comparisonMapContainer.current || !mapToken || !comparisonMode) {
      if (comparisonMap.current) {
        comparisonMap.current.remove();
        comparisonMap.current = null;
      }
      return;
    }

    if (comparisonMap.current) return;

    mapboxgl.accessToken = mapToken;

    comparisonMap.current = new mapboxgl.Map({
      container: comparisonMapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [46.6753, 24.7136],
      zoom: 10,
    });

    comparisonMap.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    comparisonMap.current.on('load', () => {
      initializeHeatmapLayers(comparisonMap.current!, 'comparison-heat');
    });

    // Sync maps
    const syncMaps = () => {
      if (map.current && comparisonMap.current) {
        map.current.on('move', () => {
          if (comparisonMap.current) {
            comparisonMap.current.setCenter(map.current!.getCenter());
            comparisonMap.current.setZoom(map.current!.getZoom());
          }
        });
        comparisonMap.current.on('move', () => {
          if (map.current) {
            map.current.setCenter(comparisonMap.current!.getCenter());
            map.current.setZoom(comparisonMap.current!.getZoom());
          }
        });
      }
    };

    syncMaps();

    return () => {
      comparisonMap.current?.remove();
      comparisonMap.current = null;
    };
  }, [mapToken, comparisonMode]);

  // Update main heatmap data
  useEffect(() => {
    if (!map.current || orderLocations.length === 0) return;

    const source = map.current.getSource('orders-heat') as mapboxgl.GeoJSONSource;
    if (!source) return;

    const features = orderLocations.map(loc => ({
      type: 'Feature' as const,
      properties: { count: loc.count },
      geometry: { type: 'Point' as const, coordinates: [loc.lng, loc.lat] }
    }));

    source.setData({ type: 'FeatureCollection', features });

    if (orderLocations.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      orderLocations.forEach(loc => bounds.extend([loc.lng, loc.lat]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [orderLocations]);

  // Update comparison heatmap data
  useEffect(() => {
    if (!comparisonMap.current || comparisonLocations.length === 0) return;

    const source = comparisonMap.current.getSource('comparison-heat') as mapboxgl.GeoJSONSource;
    if (!source) return;

    const features = comparisonLocations.map(loc => ({
      type: 'Feature' as const,
      properties: { count: loc.count },
      geometry: { type: 'Point' as const, coordinates: [loc.lng, loc.lat] }
    }));

    source.setData({ type: 'FeatureCollection', features });
  }, [comparisonLocations]);

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
          <div className="flex items-center gap-2">
            <Switch
              id="comparison-mode"
              checked={comparisonMode}
              onCheckedChange={setComparisonMode}
            />
            <Label htmlFor="comparison-mode" className="text-sm flex items-center gap-1">
              <GitCompare className="h-4 w-4" />
              مقارنة الفترات
            </Label>
          </div>
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

      {/* Comparison Stats Banner */}
      {comparisonMode && comparisonStats && (
        <Card className={`border-2 ${comparisonStats.change >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold">{comparisonStats.period1Orders}</p>
                  <p className="text-xs text-muted-foreground">الفترة الحالية</p>
                </div>
                <div className="text-center text-muted-foreground">vs</div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{comparisonStats.period2Orders}</p>
                  <p className="text-xs text-muted-foreground">الفترة السابقة</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 text-lg font-bold ${comparisonStats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {comparisonStats.change > 0 ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : comparisonStats.change < 0 ? (
                  <ArrowDownRight className="h-5 w-5" />
                ) : (
                  <Minus className="h-5 w-5" />
                )}
                <span>{comparisonStats.change > 0 ? '+' : ''}{comparisonStats.change} طلب</span>
                <Badge variant={comparisonStats.change >= 0 ? 'default' : 'destructive'}>
                  {comparisonStats.changePercent > 0 ? '+' : ''}{comparisonStats.changePercent.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">فلترة:</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">الفترة:</span>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {comparisonMode && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">مقارنة بـ:</span>
                <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {periodOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label} السابقة</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

      {/* Maps */}
      <div className={`grid gap-4 ${comparisonMode ? 'lg:grid-cols-2' : 'lg:grid-cols-4'}`}>
        <Card className={comparisonMode ? '' : 'lg:col-span-3'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {comparisonMode ? `الفترة الحالية (${periodOptions.find(p => p.value === period)?.label})` : 'خريطة الطلبات'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div 
              ref={mapContainer} 
              className="h-[400px] rounded-lg overflow-hidden"
              style={{ minHeight: '400px' }}
            />
          </CardContent>
        </Card>

        {comparisonMode && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                الفترة السابقة ({periodOptions.find(p => p.value === comparisonPeriod)?.label})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div 
                ref={comparisonMapContainer} 
                className="h-[400px] rounded-lg overflow-hidden"
                style={{ minHeight: '400px' }}
              />
            </CardContent>
          </Card>
        )}

        {!comparisonMode && (
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
                  <p className="text-sm text-muted-foreground text-center py-4">جاري التحميل...</p>
                ) : hotZones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات كافية</p>
                ) : (
                  hotZones.map((zone, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate flex-1">{index + 1}. {zone.name}</span>
                        <Badge variant="secondary" className="ml-2">{zone.count}</Badge>
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
                      <p className="text-xs text-muted-foreground">{zone.percentage.toFixed(1)}% من إجمالي الطلبات</p>
                    </div>
                  ))
                )}
              </div>

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
        )}
      </div>

      {/* Comparison Hot Zones */}
      {comparisonMode && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                المناطق الأكثر طلباً - الفترة الحالية
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {hotZones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">لا توجد بيانات</p>
                ) : (
                  hotZones.map((zone, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{index + 1}. {zone.name}</span>
                      <Badge variant="secondary">{zone.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-blue-500" />
                المناطق الأكثر طلباً - الفترة السابقة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {comparisonHotZones.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">لا توجد بيانات</p>
                ) : (
                  comparisonHotZones.map((zone, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm truncate flex-1">{index + 1}. {zone.name}</span>
                      <Badge variant="secondary">{zone.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
