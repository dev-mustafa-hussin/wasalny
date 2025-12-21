import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChefHat,
  Star,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderRatingDialog } from "@/components/customer/OrderRatingDialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

const statusConfig: Record<
  string,
  {
    label: string;
    icon: any;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  pending: { label: "قيد الانتظار", icon: Clock, variant: "secondary" },
  confirmed: { label: "تم التأكيد", icon: CheckCircle, variant: "default" },
  preparing: { label: "جاري التحضير", icon: ChefHat, variant: "default" },
  ready: { label: "جاهز للاستلام", icon: Package, variant: "default" },
  out_for_delivery: { label: "في الطريق", icon: Truck, variant: "default" },
  delivered: { label: "تم التوصيل", icon: CheckCircle, variant: "outline" },
  cancelled: { label: "ملغي", icon: XCircle, variant: "destructive" },
};

export default function MyOrders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [ratingOrder, setRatingOrder] = useState<{
    id: string;
    storeId: string;
  } | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          stores (name),
          order_items (*)
        `
        )
        .eq("customer_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ... (useEffect remains same) ...

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMMM yyyy - HH:mm", {
        locale: ar,
      });
    } catch (e) {
      return "تاريخ غير متوفر";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-6">
        {/* ... (breadcrumb remains same) ... */}

        <h1 className="text-2xl font-bold mb-6">طلباتي</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              // Ensure we have a valid status, defaulting to pending if unknown
              const statusKey =
                order.status in statusConfig ? order.status : "pending";
              const status = statusConfig[statusKey];
              const StatusIcon = status.icon;
              const isActive = !["delivered", "cancelled"].includes(
                order.status
              );

              return (
                <Link key={order.id} to={`/order/${order.id}`}>
                  <Card
                    className={`hover:shadow-md transition-shadow cursor-pointer ${
                      isActive ? "border-primary/50" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold">
                            {order.stores?.name || "متجر غير معروف"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <Badge
                          variant={status.variant}
                          className={`flex items-center gap-1 ${
                            isActive ? "animate-pulse" : ""
                          }`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      {/* ... rest of card ... */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {order.order_items?.length} منتجات
                        </span>
                        <span className="font-bold">
                          {Number(order.total_amount).toFixed(2)} ر.س
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                        {order.delivery_address}
                      </p>
                      {isActive && (
                        <p className="text-xs text-primary mt-2">
                          اضغط لتتبع الطلب
                        </p>
                      )}
                    </CardContent>
                    {order.status === "delivered" && !order.rating && (
                      <div className="px-4 pb-4 border-t pt-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRatingOrder({
                                id: order.id,
                                storeId: order.store_id,
                              });
                            }}
                          >
                            <Star className="h-4 w-4 ml-1" />
                            تقييم الطلب
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
        {/* Rating Dialog */}
        {ratingOrder && (
          <OrderRatingDialog
            open={!!ratingOrder}
            onOpenChange={(open) => !open && setRatingOrder(null)}
            orderId={ratingOrder.id}
            storeId={ratingOrder.storeId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["my-orders"] });
            }}
          />
        )}
      </div>
    </div>
  );
}
