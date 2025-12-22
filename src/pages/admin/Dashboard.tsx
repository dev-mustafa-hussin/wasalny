import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { RecentOrdersWidget } from "@/components/admin/dashboard/RecentOrdersWidget";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { ShoppingCart } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";

interface OrderStatus {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface DailyRevenue {
  date: string;
  revenue: number;
}

interface Stats {
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalDrivers: number;
  pendingOrders: number;
  todayOrders: number;
  averageRating: number;
  ratedOrders: number;
  ratingBreakdown: { rating: number; count: number }[];
  dailyRevenue: DailyRevenue[];
  ordersByStatus: OrderStatus[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStores: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalDrivers: 0,
    pendingOrders: 0,
    todayOrders: 0,
    averageRating: 0,
    ratedOrders: 0,
    ratingBreakdown: [],
    dailyRevenue: [],
    ordersByStatus: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      stores,
      products,
      orders,
      drivers,
      pending,
      todayData,
      ratedOrdersData,
      revenueData,
      allOrdersStatus,
    ] = await Promise.all([
      supabase.from("stores").select("id", { count: "exact", head: true }),
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase.from("drivers").select("id", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today.toISOString()),
      supabase.from("orders").select("rating").not("rating", "is", null),
      supabase
        .from("orders")
        .select("total_amount, created_at")
        .gte("created_at", sevenDaysAgo.toISOString()),
      supabase.from("orders").select("status"),
    ]);

    // Calculate rating statistics
    const ratings = ratedOrdersData.data || [];
    const ratedCount = ratings.length;
    const avgRating =
      ratedCount > 0
        ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedCount
        : 0;

    // Calculate rating breakdown
    const breakdown = [5, 4, 3, 2, 1].map((rating) => ({
      rating,
      count: ratings.filter((r) => r.rating === rating).length,
    }));

    // Calculate daily revenue for last 7 days
    const dailyRevenueMap: Record<string, number> = {};
    const ordersData = revenueData.data || [];

    // Initialize all 7 days with 0
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toLocaleDateString("ar-SA", {
        weekday: "short",
        day: "numeric",
      });
      dailyRevenueMap[dateStr] = 0;
    }

    // Sum up revenue per day
    ordersData.forEach((order) => {
      const orderDate = new Date(order.created_at);
      const dateStr = orderDate.toLocaleDateString("ar-SA", {
        weekday: "short",
        day: "numeric",
      });
      if (dailyRevenueMap[dateStr] !== undefined) {
        dailyRevenueMap[dateStr] += Number(order.total_amount) || 0;
      }
    });

    const dailyRevenue = Object.entries(dailyRevenueMap).map(
      ([date, revenue]) => ({
        date,
        revenue,
      })
    );

    // Calculate orders by status
    const statusConfig = [
      { status: "pending", label: "معلق", color: "hsl(var(--warning))" },
      { status: "accepted", label: "مقبول", color: "hsl(var(--info))" },
      {
        status: "preparing",
        label: "قيد التحضير",
        color: "hsl(var(--accent))",
      },
      {
        status: "out_for_delivery",
        label: "في الطريق",
        color: "hsl(var(--primary))",
      },
      {
        status: "delivered",
        label: "تم التوصيل",
        color: "hsl(var(--success))",
      },
      { status: "cancelled", label: "ملغي", color: "hsl(var(--destructive))" },
    ];

    const allOrders = allOrdersStatus.data || [];
    const ordersByStatus = statusConfig
      .map((config) => ({
        ...config,
        count: allOrders.filter((o) => o.status === config.status).length,
      }))
      .filter((s) => s.count > 0);

    setStats({
      totalStores: stores.count || 0,
      totalProducts: products.count || 0,
      totalOrders: orders.count || 0,
      totalDrivers: drivers.count || 0,
      pendingOrders: pending.count || 0,
      todayOrders: todayData.count || 0,
      averageRating: avgRating,
      ratedOrders: ratedCount,
      ratingBreakdown: breakdown,
      dailyRevenue,
      ordersByStatus,
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على تطبيق وصلني</p>
      </div>

      <DashboardStats stats={stats} loading={loading} />

      <div className="grid gap-4 md:grid-cols-7">
        <div className="md:col-span-4">
          <RevenueChart data={stats.dailyRevenue} loading={loading} />
        </div>
        <div className="md:col-span-3">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">الطلبات حسب الحالة</CardTitle>
              <div className="p-2 rounded-lg bg-info">
                <ShoppingCart className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-[200px] w-full">
                    <ChartContainer
                      config={{
                        count: { label: "عدد الطلبات" },
                      }}
                      className="h-full w-full"
                    >
                      <PieChart>
                        <Pie
                          data={stats.ordersByStatus}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={50}
                        >
                          {stats.ordersByStatus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ChartContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {stats.ordersByStatus.map((item) => (
                      <div
                        key={item.status}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">
                          {item.label}: {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <RecentOrdersWidget />
      </div>
    </div>
  );
}
