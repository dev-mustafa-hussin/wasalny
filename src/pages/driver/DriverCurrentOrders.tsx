import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Package, Navigation } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function DriverCurrentOrders() {
  const { user } = useAuth();

  const {
    data: currentOrder,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["driver-current-order", user?.id],
    queryFn: async () => {
      // Find orders assigned to driver that are NOT delivered or cancelled
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          store:stores(name, address, phone, latitude, longitude),
          customer:profiles!orders_customer_id_fkey(full_name, phone_number)
        `
        )
        .eq("driver_id", user?.id)
        .in("status", [
          "accepted",
          "preparing",
          "ready_for_pickup",
          "out_for_delivery",
        ])
        .single(); // Assuming one active order at a time usually

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("تم وتحديث حالة الطلب");
      refetch();
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث الحالة");
    }
  };

  if (isLoading)
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );

  if (!currentOrder) {
    return (
      <div className="container py-8 text-center bg-muted/30 min-h-[50vh] flex flex-col items-center justify-center rounded-lg mt-4">
        <Package className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2">لا توجد طلبات جارية</h2>
        <p className="text-muted-foreground">عند قبول طلب جديد، سيظهر هنا.</p>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "accepted":
        return "تم القبول (توجه للمتجر)";
      case "preparing":
        return "جاري التحضير";
      case "ready_for_pickup":
        return "جاهز للاستلام";
      case "out_for_delivery":
        return "جاري التوصيل";
      default:
        return status;
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">الطلب الحالي</h1>

      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-primary/5 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl mb-1">
                طلب #{currentOrder.id.slice(0, 8)}
              </CardTitle>
              <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary text-primary-foreground">
                {getStatusLabel(currentOrder.status)}
              </div>
            </div>
            <div className="text-lg font-bold">
              {currentOrder.total_amount} ر.س
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Store Info */}
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <StoreIcon />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">
                استلام من: {currentOrder.store?.name}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <MapPin className="h-4 w-4 ml-1" />
                {currentOrder.store?.address}
              </div>
              <Button size="sm" variant="outline" className="h-8" asChild>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${currentOrder.store?.latitude},${currentOrder.store?.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Navigation className="h-3 w-3 ml-1" />
                  الموقع
                </a>
              </Button>
            </div>
          </div>

          <div className="flex justify-center flex-col items-center gap-2 py-2">
            <div className="h-8 w-0.5 bg-border border-dashed border-l-2" />
            <Package className="h-5 w-5 text-muted-foreground" />
            <div className="h-8 w-0.5 bg-border border-dashed border-l-2" />
          </div>

          {/* Customer Info */}
          <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <UserIcon />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">
                توصيل إلى: {currentOrder.customer?.full_name}
              </h3>
              <div className="flex items-center text-sm text-muted-foreground mb-2">
                <MapPin className="h-4 w-4 ml-1" />
                {currentOrder.delivery_address || "عنوان العميل"}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8" asChild>
                  <a href={`tel:${currentOrder.customer?.phone_number}`}>
                    <Phone className="h-3 w-3 ml-1" />
                    اتصال
                  </a>
                </Button>
                {currentOrder.delivery_lat && (
                  <Button size="sm" variant="outline" className="h-8" asChild>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${currentOrder.delivery_lat},${currentOrder.delivery_long}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation className="h-3 w-3 ml-1" />
                      الموقع
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t flex flex-col gap-3">
            {currentOrder.status === "accepted" && (
              <Button
                className="w-full"
                onClick={() => updateStatus(currentOrder.id, "picked_up")}
              >
                تم الاستلام من المتجر (بدء التوصيل)
              </Button>
            )}
            {/* Note: 'picked_up' usually transitions to 'out_for_delivery' or directly 'delivered'? 
                Let's assume 'out_for_delivery' is next or 'picked_up' IS out for delivery.
                Using 'out_for_delivery' as standard step.
            */}
            {currentOrder.status === "accepted" && (
              <Button
                className="w-full"
                onClick={() =>
                  updateStatus(currentOrder.id, "out_for_delivery")
                }
              >
                تم الاستلام (جاري التوصيل)
              </Button>
            )}
            {currentOrder.status === "out_for_delivery" && (
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => updateStatus(currentOrder.id, "delivered")}
              >
                تم التوصيل (إنهاء الطلب)
              </Button>
            )}
            {currentOrder.status === "preparing" && (
              <Button className="w-full" disabled>
                بانتظار تجهيز المتجر...
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-store text-primary"
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="lucide lucide-user text-primary"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
