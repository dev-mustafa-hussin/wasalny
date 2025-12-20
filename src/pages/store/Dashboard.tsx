import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StoreDashboard() {
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStore = async () => {
      // Mock fetching store - in production this would come from auth context or proper relation
      const { data: firstStore } = await supabase
        .from("stores")
        .select("id")
        .limit(1)
        .single();
      if (firstStore) setStoreId(firstStore.id);
    };
    fetchStore();
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["store-stats", storeId],
    queryFn: async () => {
      if (!storeId) return null;

      // 1. Total Revenue (Sum of delivered orders)
      const { data: revenueData } = await supabase
        .from("orders")
        .select("total_amount")
        .eq("store_id", storeId)
        .eq("status", "delivered");

      const totalRevenue =
        revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      // 2. Orders Count (All)
      const { count: totalOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId);

      // 3. Active Products
      const { count: activeProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("is_available", true);

      // 4. Pending Orders
      const { count: pendingOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId)
        .eq("status", "pending");

      return {
        totalRevenue,
        totalOrders: totalOrders || 0,
        activeProducts: activeProducts || 0,
        pendingOrders: pendingOrders || 0,
      };
    },
    enabled: !!storeId,
  });

  if (!storeId || isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">لوحة التحكم</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-20" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-3xl font-bold tracking-tight">لوحة التحكم</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي المبيعات
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalRevenue.toLocaleString()} د.ع
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              +20.1% من الشهر الماضي
            </p>
          </CardContent>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الطلبات
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">+180 طلب جديد</p>
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              طلبات قيد الانتظار
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              تحتاج إلى اتخاذ إجراء
            </p>
          </CardContent>
        </Card>

        {/* Active Products */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              المنتجات النشطة
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              منتج متاح حالياً
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
