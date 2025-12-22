import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Navigation,
  User,
  RefreshCw,
  Route,
  X,
  Search,
  Phone,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
    phone_number?: string;
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
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapToken, setMapToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRoutes, setActiveRoutes] = useState<Record<string, RouteInfo>>(
    {}
  );
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "get-mapbox-token"
        );
        if (error) throw error;
        if (data?.token) {
          setMapToken(data.token);
        } else {
          setError("لم يتم تكوين مفتاح Mapbox");
        }
      } catch (err: any) {
        console.error("Error fetching Mapbox token:", err);
        setError("فشل في جلب مفتاح الخريطة");
      }
    };
    fetchToken();
  }, []);

  // Fetch drivers with profiles and active orders
  const fetchDrivers = async () => {
    setLoading(true);
    const { data: driversData, error } = await supabase
      .from("drivers")
      .select("*");

    if (error) {
      console.error("Error fetching drivers:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles for drivers
    const driverUserIds = driversData?.map((d) => d.user_id) || [];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone_number")
      .in("user_id", driverUserIds);

    // Fetch active orders for drivers
    const driverIds = driversData?.map((d) => d.id) || [];
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, driver_id, delivery_address, delivery_lat, delivery_lng")
      .in("driver_id", driverIds)
      .in("status", ["out_for_delivery", "picked_up"]);

    const driversWithProfiles =
      driversData?.map((driver) => ({
        ...driver,
        profile: profilesData?.find((p) => p.user_id === driver.user_id),
        activeOrder: ordersData?.find((o) => o.driver_id === driver.id),
      })) || [];

    setDrivers(driversWithProfiles);
    setFilteredDrivers(driversWithProfiles);
    setLoading(false);
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Filter drivers based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredDrivers(drivers);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredDrivers(
        drivers.filter(
          (d) =>
            d.profile?.full_name?.toLowerCase().includes(query) ||
            d.vehicle_number?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, drivers]);

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("drivers-location")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "drivers",
        },
        (payload) => {
          console.log("Driver location updated:", payload);
          setDrivers((prev) =>
            prev.map((d) =>
              d.id === payload.new.id ? { ...d, ...payload.new } : d
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch route from Mapbox Directions API
  const fetchRoute = useCallback(
    async (
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
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: route.geometry,
            },
          });

          map.current.addLayer({
            id: routeId,
            type: "line",
            source: routeId,
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": "#3b82f6",
              "line-width": 5,
              "line-opacity": 0.8,
            },
          });

          // Store route info
          setActiveRoutes((prev) => ({
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
            (bounds: mapboxgl.LngLatBounds, coord: [number, number]) =>
              bounds.extend(coord),
            new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
          );
          map.current.fitBounds(bounds, { padding: 80 });
        }
      } catch (err) {
        console.error("Error fetching route:", err);
      }
    },
    [mapToken]
  );

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

    setActiveRoutes((prev) => {
      const newRoutes = { ...prev };
      delete newRoutes[driverId];
      return newRoutes;
    });

    setSelectedDriver(null);
  }, []);

  // Show route for driver
  const showRoute = useCallback(
    (driver: Driver) => {
      if (
        !driver.current_lat ||
        !driver.current_lng ||
        !driver.activeOrder?.delivery_lat ||
        !driver.activeOrder?.delivery_lng
      ) {
        return;
      }

      // Add destination marker
      if (map.current) {
        // Remove existing destination marker
        if (destinationMarkersRef.current[driver.id]) {
          destinationMarkersRef.current[driver.id].remove();
        }

        const el = document.createElement("div");
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
          .setLngLat([
            driver.activeOrder.delivery_lng,
            driver.activeOrder.delivery_lat,
          ])
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
    },
    [fetchRoute]
  );

  const handleDriverClick = (driver: Driver) => {
    setSelectedDriver(driver.id);
    if (driver.current_lat && driver.current_lng && map.current) {
      map.current.flyTo({
        center: [driver.current_lng, driver.current_lat],
        zoom: 15,
      });
      markersRef.current[driver.id]?.togglePopup();

      if (driver.activeOrder) {
        showRoute(driver);
      }
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapToken || map.current) return;

    mapboxgl.accessToken = mapToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [46.6753, 24.7136], // Riyadh, Saudi Arabia
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.current.addControl(new mapboxgl.FullscreenControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapToken]);

  // Update markers when drivers change
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // Add new markers
    drivers.forEach((driver) => {
      if (driver.current_lat && driver.current_lng) {
        const el = document.createElement("div");
        el.className = "driver-marker cursor-pointer";
        const hasActiveOrder = !!driver.activeOrder;
        el.innerHTML = `
          <div class="relative">
            <div class="w-10 h-10 rounded-full ${
              hasActiveOrder
                ? "bg-blue-500"
                : driver.is_available
                ? "bg-green-500"
                : "bg-gray-400"
            } flex items-center justify-center shadow-lg border-2 border-white transition-transform hover:scale-110">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
            </div>
            ${
              hasActiveOrder
                ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping"></div>'
                : driver.is_available
                ? '<div class="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>'
                : ""
            }
          </div>
        `;

        el.addEventListener("click", () => handleDriverClick(driver));

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 text-right" dir="rtl">
            <p class="font-bold">${driver.profile?.full_name || "مندوب"}</p>
            <p class="text-sm text-gray-600">${
              driver.vehicle_type || "غير محدد"
            } - ${driver.vehicle_number || ""}</p>
            <p class="text-sm ${
              hasActiveOrder
                ? "text-blue-600"
                : driver.is_available
                ? "text-green-600"
                : "text-gray-500"
            }">
              ${
                hasActiveOrder
                  ? "🚗 في مهمة توصيل"
                  : driver.is_available
                  ? "✓ متاح"
                  : "✗ غير متاح"
              }
            </p>
            ${
              hasActiveOrder
                ? `<p class="text-xs text-gray-500 mt-1">${
                    driver.activeOrder?.delivery_address || ""
                  }</p>`
                : ""
            }
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([driver.current_lng, driver.current_lat])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current[driver.id] = marker;
      }
    });
  }, [drivers, mapToken]);

  const availableCount = drivers.filter((d) => d.is_available).length;
  const driversWithLocation = drivers.filter(
    (d) => d.current_lat && d.current_lng
  );
  const driversWithOrders = drivers.filter((d) => d.activeOrder);

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
    <div className="flex h-[calc(100vh-100px)] gap-4 overflow-hidden">
      {/* Sidebar List */}
      <Card className="w-80 flex flex-col h-full border-none shadow-md bg-white">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Navigation className="h-5 w-5" />
            المندوبين المتصلين
          </h2>
          <div className="relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن مندوب..."
              className="pr-9 bg-gray-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-3">
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 hover:bg-green-100"
            >
              {availableCount} متاح
            </Badge>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 hover:bg-blue-100"
            >
              {driversWithOrders.length} مشغول
            </Badge>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {filteredDrivers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا يوجد مناديب
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  onClick={() => handleDriverClick(driver)}
                  className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 border ${
                    selectedDriver === driver.id
                      ? "bg-blue-50 border-blue-200 ring-1 ring-blue-300"
                      : "border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          driver.activeOrder
                            ? "bg-blue-500 animate-pulse"
                            : driver.is_available
                            ? "bg-green-500"
                            : "bg-gray-300"
                        }`}
                      />
                      <span className="font-semibold text-sm">
                        {driver.profile?.full_name || "مندوب"}
                      </span>
                    </div>
                    {driver.activeOrder && (
                      <Badge className="text-[10px] h-5 px-1 bg-blue-500">
                        في طلب
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>
                        {driver.vehicle_type} - {driver.vehicle_number}
                      </span>
                    </div>
                    {driver.profile?.phone_number && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span dir="ltr">{driver.profile.phone_number}</span>
                      </div>
                    )}
                  </div>

                  {selectedDriver === driver.id && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                      >
                        <MessageSquare className="h-3 w-3 ml-1" />
                        مراسلة
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs"
                      >
                        <Phone className="h-3 w-3 ml-1" />
                        اتصال
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Map Area */}
      <div className="flex-1 relative rounded-xl overflow-hidden shadow-lg border bg-white">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Floating Route Info */}
        {selectedDriver && activeRoutes[selectedDriver] && (
          <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-10 animate-in slide-in-from-top-4 fade-in">
            <Card className="bg-white/95 backdrop-blur shadow-xl border-blue-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Route className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">
                      {activeRoutes[selectedDriver].distance.toFixed(1)} كم
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round(activeRoutes[selectedDriver].duration)} دقيقة
                      للوصول
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-gray-600"
                  onClick={() => clearRoute(selectedDriver)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="absolute bottom-4 right-4 z-10">
          <Button
            onClick={fetchDrivers}
            disabled={loading}
            className="shadow-lg"
          >
            <RefreshCw
              className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`}
            />
            تحديث المواقع
          </Button>
        </div>
      </div>
    </div>
  );
}
