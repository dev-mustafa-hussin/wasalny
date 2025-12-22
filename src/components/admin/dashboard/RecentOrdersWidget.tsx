import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  profiles: { full_name: string } | null;
  stores: { name: string } | null;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "معلق", color: "bg-yellow-500" },
  accepted: { label: "مقبول", color: "bg-blue-500" },
  preparing: { label: "قيد التحضير", color: "bg-orange-500" },
  ready: { label: "جاهز", color: "bg-green-500" },
  out_for_delivery: { label: "في الطريق", color: "bg-purple-500" },
  delivered: { label: "تم التوصيل", color: "bg-green-600" },
  cancelled: { label: "ملغي", color: "bg-red-500" },
};

export function RecentOrdersWidget() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRecentOrders();

    // Subscribe to new orders
    const channel = supabase
      .channel("dashboard-recent-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => fetchRecentOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, profiles(full_name), stores(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    if (data) setOrders(data);
    setLoading(false);
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-bold">آخر الطلبات</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/orders")}
        >
          عرض الكل
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لا توجد طلبات حديثة
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusMap[order.status] || {
                label: order.status,
                color: "bg-gray-500",
              };
              return (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">
                      {order.profiles?.full_name || "عميل غير معروف"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.stores?.name} •{" "}
                      {format(new Date(order.created_at), "h:mm a", {
                        locale: ar,
                      })}
                    </p>
                  </div>
                  <div className="text-left space-y-1">
                    <Badge
                      className={`${status.color} hover:${status.color} text-[10px]`}
                    >
                      {status.label}
                    </Badge>
                    <p className="text-xs font-semibold">
                      {(order.total_amount + order.delivery_fee).toFixed(2)} ر.س
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
