import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LocationPickerProps {
  onLocationSelect: (location: {
    lat: number;
    lng: number;
    address: string;
  }) => void;
  initialLat?: number;
  initialLng?: number;
}

export function LocationPicker({
  onLocationSelect,
  initialLat,
  initialLng,
}: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addressLoading, setAddressLoading] = useState(false);

  // Default to Cairo if no initial location
  const defaultLat = 30.0444;
  const defaultLng = 31.2357;

  useEffect(() => {
    const fetchToken = async () => {
      // First try to get from environment variable
      const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
      if (envToken) {
        setMapboxToken(envToken);
        return;
      }

      // Fallback to Edge Function
      try {
        const { data, error } = await supabase.functions.invoke(
          "get-mapbox-token"
        );
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (err) {
        console.error("Error fetching Mapbox token:", err);
        toast.error("خطأ في تحميل مفتاح الخريطة");
      }
    };
    fetchToken();
  }, []);

  const getAddressFromCoords = useCallback(
    async (lat: number, lng: number) => {
      if (!mapboxToken) return;

      setAddressLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&language=ar`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const address = data.features[0].place_name;
          onLocationSelect({ lat, lng, address });
        }
      } catch (error) {
        console.error("Error fetching address:", error);
      } finally {
        setAddressLoading(false);
      }
    },
    [mapboxToken, onLocationSelect]
  );

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12", // Satellite view for better detail
      center: [initialLng || defaultLng, initialLat || defaultLat],
      zoom: 15, // Zoom in closer
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-left");

    // Add draggable marker
    marker.current = new mapboxgl.Marker({
      draggable: true,
      color: "#ef4444",
    })
      .setLngLat([initialLng || defaultLng, initialLat || defaultLat])
      .addTo(map.current);

    // Handle drag end
    marker.current.on("dragend", () => {
      const lngLat = marker.current?.getLngLat();
      if (lngLat) {
        getAddressFromCoords(lngLat.lat, lngLat.lng);

        // Fly to location
        map.current?.flyTo({
          center: lngLat,
          zoom: 15,
          speed: 1.5,
        });
      }
    });

    // Handle map click
    map.current.on("click", (e) => {
      marker.current?.setLngLat(e.lngLat);
      getAddressFromCoords(e.lngLat.lat, e.lngLat.lng);

      map.current?.flyTo({
        center: e.lngLat,
        speed: 1.5,
      });
    });

    // Initial address fetch
    if (initialLat && initialLng) {
      getAddressFromCoords(initialLat, initialLng);
    } else {
      // If just default Cairo, maybe don't fetch address yet to avoid confusion,
      // or fetch it so the field isn't empty. Let's fetch.
      getAddressFromCoords(defaultLat, defaultLng);
    }

    setLoading(false);

    return () => {
      map.current?.remove();
    };
  }, [
    mapboxToken,
    initialLat,
    initialLng,
    defaultLat,
    defaultLng,
    getAddressFromCoords,
  ]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("الموقع غير مدعوم في متصفحك");
      return;
    }

    toast.info("جاري تحديد موقعك...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        marker.current?.setLngLat([longitude, latitude]);
        map.current?.flyTo({
          center: [longitude, latitude],
          zoom: 15,
        });

        getAddressFromCoords(latitude, longitude);
        toast.success("تم تحديد موقعك");
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("تعذر تحديد الموقع. تأكد من تفعيل الـ GPS");
      }
    );
  };

  if (!mapboxToken) return null;

  return (
    <Card className="overflow-hidden border-2 border-primary/10">
      <div className="relative h-[300px] w-full bg-muted/20">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        <div ref={mapContainer} className="h-full w-full" />

        <Button
          type="button"
          onClick={handleGetCurrentLocation}
          variant="secondary"
          size="sm"
          className="absolute top-4 right-14 z-10 shadow-md bg-background/90 hover:bg-background"
        >
          <Navigation className="h-4 w-4 mr-2 text-primary" />
          موقعي الحالي
        </Button>

        {addressLoading && (
          <div className="absolute bottom-4 right-4 left-4 bg-background/90 backdrop-blur p-2 rounded-lg shadow-lg text-sm text-center animate-in fade-in slide-in-from-bottom-2">
            <Loader2 className="h-3 w-3 inline-block animate-spin ml-2" />
            جاري تحديد العنوان...
          </div>
        )}
      </div>
      <div className="p-3 bg-muted/30 text-xs text-muted-foreground text-center">
        قم بتحريك الدبوس 📍 لتحديد مكان التوصيل بدقة
      </div>
    </Card>
  );
}
