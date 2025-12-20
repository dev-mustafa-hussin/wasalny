import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Package,
  Navigation,
  Truck,
  LogOut,
  DollarSign,
  Clock,
  Settings,
  Star,
} from "lucide-react";
import { useDriverGPS } from "@/hooks/useDriverGPS";
import { useNewOrderSound } from "@/hooks/useNewOrderSound";
import { DriverStats } from "@/components/driver/DriverStats";
import { ActiveOrders } from "@/components/driver/ActiveOrders";
import { AvailableOrders } from "@/components/driver/AvailableOrders";
import { DriverInfo, Order } from "@/components/driver/types";

export default function DriverDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const { playSound } = useNewOrderSound();

  const {
    location,
    isTracking,
    startTracking,
    stopTracking,
    error: gpsError,
  } = useDriverGPS({
    driverId: driverInfo?.id || "",
    enabled: !!driverInfo?.id,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchDriverData();
  }, [user]);

  useEffect(() => {
    if (!driverInfo?.id) return;

    // Subscribe to order changes
    const channel = supabase
      .channel("driver-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          fetchOrders();

          // Play sound for new available orders
          if (
            payload.eventType === "UPDATE" ||
            payload.eventType === "INSERT"
          ) {
            const order = payload.new as any;
            // If order becomes ready and has no driver, it's a new available order
            if (
              order.status === "ready" &&
              !order.driver_id &&
              driverInfo?.is_available
            ) {
              playSound();
              toast.info("🔔 طلب جديد متاح!", {
                description: "يوجد طلب جديد جاهز للاستلام",
                duration: 5000,
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverInfo?.id, driverInfo?.is_available, playSound]);

  async function fetchDriverData() {
    if (!user) return;

    try {
      // Get driver info
      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (driverError) {
        if (driverError.code === "PGRST116") {
          toast.error("لم يتم العثور على حساب مندوب");
          navigate("/");
          return;
        }
        throw driverError;
      }

      setDriverInfo(driver as DriverInfo);
      await fetchOrders(driver.id);
      await fetchTodayStats(driver.id);
    } catch (error) {
      console.error("Error fetching driver data:", error);
      toast.error("حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders(driverId?: string) {
    const id = driverId || driverInfo?.id;
    if (!id) return;

    try {
      // Fetch assigned orders (in progress)
      const { data: assigned, error: assignedError } = await supabase
        .from("orders")
        .select(
          `
          *,
          store:stores(name, address)
        `
        )
        .eq("driver_id", id)
        .in("status", ["confirmed", "preparing", "ready", "out_for_delivery"])
        .order("created_at", { ascending: false });

      if (assignedError) throw assignedError;

      // Get customer profiles
      const ordersWithCustomers = await Promise.all(
        (assigned || []).map(async (order) => {
          if (order.customer_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("user_id", order.customer_id)
              .single();
            return { ...order, customer: profile };
          }
          return { ...order, customer: null };
        })
      );

      setAssignedOrders(ordersWithCustomers as Order[]);

      // Fetch available orders (ready for pickup, no driver assigned)
      const { data: available, error: availableError } = await supabase
        .from("orders")
        .select(
          `
          *,
          store:stores(name, address)
        `
        )
        .is("driver_id", null)
        .eq("status", "ready")
        .order("created_at", { ascending: false });

      if (availableError) throw availableError;

      // Add null customer for available orders
      const availableWithCustomer = (available || []).map((order) => ({
        ...order,
        customer: null,
      }));

      setAvailableOrders(availableWithCustomer as Order[]);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }

  async function fetchTodayStats(driverId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const { data: todayOrders, error } = await supabase
        .from("orders")
        .select("delivery_fee")
        .eq("driver_id", driverId)
        .eq("status", "delivered")
        .gte("created_at", today.toISOString());

      if (error) throw error;

      const earnings =
        todayOrders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;
      setTodayEarnings(earnings);
      setCompletedToday(todayOrders?.length || 0);
    } catch (error) {
      console.error("Error fetching today stats:", error);
    }
  }

  async function toggleAvailability() {
    if (!driverInfo) return;

    try {
      const newStatus = !driverInfo.is_available;
      const { error } = await supabase
        .from("drivers")
        .update({ is_available: newStatus })
        .eq("id", driverInfo.id);

      if (error) throw error;

      setDriverInfo({ ...driverInfo, is_available: newStatus });
      toast.success(
        newStatus ? "أنت متاح الآن لاستقبال الطلبات" : "أنت غير متاح حالياً"
      );

      // Auto toggle GPS with availability
      if (newStatus && !isTracking) {
        startTracking();
      } else if (!newStatus && isTracking) {
        stopTracking();
      }
    } catch (error) {
      console.error("Error toggling availability:", error);
      toast.error("حدث خطأ");
    }
  }

  async function acceptOrder(orderId: string) {
    if (!driverInfo) return;

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          driver_id: driverInfo.id,
          status: "out_for_delivery",
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("تم قبول الطلب");
      fetchOrders();
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("حدث خطأ في قبول الطلب");
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;

      toast.success(
        newStatus === "delivered" ? "تم التوصيل بنجاح!" : "تم تحديث حالة الطلب"
      );
      fetchOrders();
      if (newStatus === "delivered" && driverInfo) {
        fetchTodayStats(driverInfo.id);
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("حدث خطأ");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">لوحة المندوب</h1>
                <p className="text-xs text-muted-foreground font-medium">
                  {driverInfo?.vehicle_type} - {driverInfo?.vehicle_number}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Availability Toggle */}
        <Card
          className={`transition-colors duration-300 ${
            driverInfo?.is_available
              ? "bg-green-500/10 border-green-500/30"
              : "bg-card"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full shadow-[0_0_10px] ${
                    driverInfo?.is_available
                      ? "bg-green-500 shadow-green-500 animate-pulse"
                      : "bg-red-500 shadow-red-500"
                  }`}
                />
                <div>
                  <p className="font-bold text-foreground">
                    {driverInfo?.is_available
                      ? "متاح لاستقبال الطلبات"
                      : "غير متاح"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isTracking ? "GPS مفعل" : "GPS غير مفعل"}
                  </p>
                </div>
              </div>
              <Switch
                checked={driverInfo?.is_available || false}
                onCheckedChange={toggleAvailability}
              />
            </div>
          </CardContent>
        </Card>

        {/* GPS Control */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    isTracking
                      ? "bg-green-100 text-green-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">تتبع الموقع</p>
                  {location && (
                    <p className="text-xs text-muted-foreground">
                      آخر تحديث:{" "}
                      {location.timestamp.toLocaleTimeString("ar-EG")}
                    </p>
                  )}
                  {gpsError && (
                    <p className="text-xs text-destructive">{gpsError}</p>
                  )}
                </div>
              </div>
              <Button
                variant={isTracking ? "destructive" : "secondary"}
                size="sm"
                onClick={isTracking ? stopTracking : startTracking}
                className="min-w-[80px]"
              >
                {isTracking ? "إيقاف" : "تفعيل"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <DriverStats
          todayEarnings={todayEarnings}
          completedToday={completedToday}
          totalEarnings={driverInfo?.total_earnings || 0}
        />

        {/* Assigned Orders */}
        {assignedOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              طلباتي الحالية
            </h2>
            <ActiveOrders
              orders={assignedOrders}
              onUpdateStatus={updateOrderStatus}
            />
          </div>
        )}

        {/* Available Orders */}
        {driverInfo?.is_available && availableOrders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-500" />
              طلبات متاحة للاستلام
            </h2>
            <AvailableOrders orders={availableOrders} onAccept={acceptOrder} />
          </div>
        )}

        {/* Empty State */}
        {assignedOrders.length === 0 && availableOrders.length === 0 && (
          <Card className="py-12 border-dashed">
            <CardContent className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">
                لا توجد طلبات حالياً
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {driverInfo?.is_available
                  ? "انتظر طلبات جديدة"
                  : "قم بتفعيل التوفر لاستقبال الطلبات"}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border z-40 pb-safe">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-primary bg-primary/10">
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-medium">الطلبات</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/driver/earnings")}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-[10px] font-medium">الأرباح</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/driver/history")}
            >
              <Clock className="w-5 h-5" />
              <span className="text-[10px] font-medium">السجل</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/driver/ratings")}
            >
              <Star className="w-5 h-5" />
              <span className="text-[10px] font-medium">التقييمات</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 p-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/driver/settings")}
            >
              <Settings className="w-5 h-5" />
              <span className="text-[10px] font-medium">الإعدادات</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
