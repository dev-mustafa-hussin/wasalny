import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Navigation,
  Locate,
  Clock,
  Route as RouteIcon,
  ExternalLink,
} from "lucide-react";

interface DriverNavigationMapProps {
  deliveryLat: number;
  deliveryLng: number;
  deliveryAddress: string;
  storeLat?: number;
  storeLng?: number;
  storeName?: string;
  storeAddress?: string;
  showStore?: boolean;
}

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
}

export function DriverNavigationMap({
  deliveryLat,
  deliveryLng,
  deliveryAddress,
  storeLat,
  storeLng,
  storeName,
  storeAddress,
  showStore = false,
}: DriverNavigationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const driverMarker = useRef<mapboxgl.Marker | null>(null);
  const deliveryMarker = useRef<mapboxgl.Marker | null>(null);
  const storeMarker = useRef<mapboxgl.Marker | null>(null);

  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Initialize Mapbox token
  useEffect(() => {
    // Priority: 1. Environment Variable, 2. Hardcoded (Fallback), 3. Edge Function
    const token =
      import.meta.env.VITE_MAPBOX_TOKEN ||
      "pk.eyJ1IjoiM21jb2Rlc29mdHdhcmVzb2x1dGlvbnMiLCJhIjoiY21lenkyb3U2MTRqZDJxczd3MHp2MzVxMiJ9.2EgCJBrDrL0eD6U3aBzCPw";

    if (token) {
      setMapboxToken(token);
    } else {
      // Fallback to fetching from backend if no token found locally
      const fetchToken = async () => {
        try {
          const { data, error } = await supabase.functions.invoke(
            "get-mapbox-token"
          );
          if (error) throw error;
          setMapboxToken(data.token);
        } catch (err) {
          console.error("Error fetching Mapbox token:", err);
        }
      };
      fetchToken();
    }
  }, []);

  // Start watching location
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLoading(false);
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setIsLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setWatchId(id);

    return () => {
      if (id !== null) {
        navigator.geolocation.clearWatch(id);
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const centerLat = currentLocation?.lat || deliveryLat;
    const centerLng = currentLocation?.lng || deliveryLng;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [centerLng, centerLat],
      zoom: 14,
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-left");

    // Add delivery marker
    const deliveryEl = document.createElement("div");
    deliveryEl.innerHTML = `
      <div style="
        background: #ef4444;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.5);
        border: 3px solid white;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    `;

    deliveryMarker.current = new mapboxgl.Marker({ element: deliveryEl })
      .setLngLat([deliveryLng, deliveryLat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; direction: rtl;">
          <div style="font-weight: bold; margin-bottom: 4px;">موقع التوصيل</div>
          <div style="font-size: 12px; color: #666;">${deliveryAddress}</div>
        </div>
      `)
      )
      .addTo(map.current);

    // Add store marker if needed
    if (showStore && storeLat && storeLng) {
      const storeEl = document.createElement("div");
      storeEl.innerHTML = `
        <div style="
          background: #f59e0b;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
          border: 3px solid white;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
            <path d="M2 7h20"/>
          </svg>
        </div>
      `;

      storeMarker.current = new mapboxgl.Marker({ element: storeEl })
        .setLngLat([storeLng, storeLat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; direction: rtl;">
            <div style="font-weight: bold; margin-bottom: 4px;">${
              storeName || "المتجر"
            }</div>
            <div style="font-size: 12px; color: #666;">${
              storeAddress || ""
            }</div>
          </div>
        `)
        )
        .addTo(map.current);
    }

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, deliveryLat, deliveryLng]);

  // Update driver marker and route
  useEffect(() => {
    if (!map.current || !currentLocation) return;

    if (driverMarker.current) {
      driverMarker.current.setLngLat([
        currentLocation.lng,
        currentLocation.lat,
      ]);
    } else {
      const driverEl = document.createElement("div");
      driverEl.innerHTML = `
        <div style="
          background: #22c55e;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(34, 197, 94, 0.5);
          border: 4px solid white;
          animation: pulse 2s infinite;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
        .setLngLat([currentLocation.lng, currentLocation.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(
            '<div style="padding: 8px; font-weight: bold; direction: rtl;">موقعك الحالي</div>'
          )
        )
        .addTo(map.current);
    }

    // Draw route and get info
    drawRoute(
      currentLocation.lng,
      currentLocation.lat,
      deliveryLng,
      deliveryLat
    );

    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds()
      .extend([currentLocation.lng, currentLocation.lat])
      .extend([deliveryLng, deliveryLat]);

    if (showStore && storeLat && storeLng) {
      bounds.extend([storeLng, storeLat]);
    }

    map.current.fitBounds(bounds, { padding: 80 });
  }, [
    currentLocation,
    deliveryLat,
    deliveryLng,
    storeLat,
    storeLng,
    showStore,
  ]);

  const drawRoute = useCallback(
    async (
      startLng: number,
      startLat: number,
      endLng: number,
      endLat: number
    ) => {
      if (!map.current || !mapboxToken) return;

      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${startLng},${startLat};${endLng},${endLat}?geometries=geojson&overview=full&access_token=${mapboxToken}`
        );

        if (!response.ok) return;

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];

          // Update route info
          setRouteInfo({
            distance: route.distance,
            duration: route.duration,
          });

          const geometry = route.geometry;

          if (map.current.getSource("route")) {
            (map.current.getSource("route") as mapboxgl.GeoJSONSource).setData({
              type: "Feature",
              properties: {},
              geometry: geometry,
            });
          } else {
            map.current.addSource("route", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: geometry,
              },
            });

            // Add glow effect
            map.current.addLayer({
              id: "route-glow",
              type: "line",
              source: "route",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#22c55e",
                "line-width": 12,
                "line-opacity": 0.3,
                "line-blur": 3,
              },
            });

            map.current.addLayer({
              id: "route",
              type: "line",
              source: "route",
              layout: {
                "line-join": "round",
                "line-cap": "round",
              },
              paint: {
                "line-color": "#22c55e",
                "line-width": 5,
                "line-opacity": 0.9,
              },
            });
          }
        }
      } catch (err) {
        console.error("Error drawing route:", err);
      }
    },
    [mapboxToken]
  );

  const centerOnLocation = () => {
    if (map.current && currentLocation) {
      map.current.flyTo({
        center: [currentLocation.lng, currentLocation.lat],
        zoom: 16,
        duration: 1000,
      });
    }
  };

  const openExternalNavigation = () => {
    // Open in Google Maps or native navigation
    const url = `https://www.google.com/maps/dir/?api=1&destination=${deliveryLat},${deliveryLng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} م`;
    }
    return `${(meters / 1000).toFixed(1)} كم`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) {
      return `${minutes} دقيقة`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} ساعة و ${remainingMinutes} دقيقة`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            خريطة الملاحة
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={centerOnLocation}
              disabled={!currentLocation}
            >
              <Locate className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={openExternalNavigation}
              className="gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              ملاحة
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Route Info */}
        {routeInfo && (
          <div className="px-4 py-2 bg-muted/50 border-y border-border flex items-center justify-around">
            <div className="flex items-center gap-2 text-sm">
              <RouteIcon className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {formatDistance(routeInfo.distance)}
              </span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="font-medium">
                {formatDuration(routeInfo.duration)}
              </span>
            </div>
          </div>
        )}

        {/* Map */}
        {isLoading ? (
          <Skeleton className="h-[350px] w-full" />
        ) : !currentLocation ? (
          <div className="h-[350px] flex items-center justify-center bg-muted/50">
            <div className="text-center text-muted-foreground p-4">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>يرجى السماح بالوصول للموقع</p>
              <p className="text-xs mt-1">لعرض الخريطة والمسار</p>
            </div>
          </div>
        ) : (
          <div ref={mapContainer} className="h-[350px] w-full" />
        )}

        {/* Legend */}
        <div className="p-3 border-t flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500" />
            <span>موقعك</span>
          </div>
          {showStore && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500" />
              <span>المتجر</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500" />
            <span>التوصيل</span>
          </div>
        </div>

        {/* Destination Address */}
        <div className="p-3 border-t bg-muted/30">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{deliveryAddress}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
