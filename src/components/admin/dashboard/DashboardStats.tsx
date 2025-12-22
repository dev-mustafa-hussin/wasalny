import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Store,
  Package,
  ShoppingCart,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";

interface StatsProps {
  stats: {
    totalStores: number;
    totalProducts: number;
    totalOrders: number;
    totalDrivers: number;
    pendingOrders: number;
    todayOrders: number;
  };
  loading: boolean;
}

export function DashboardStats({ stats, loading }: StatsProps) {
  const statCards = [
    {
      title: "المتاجر",
      value: stats.totalStores,
      icon: Store,
      color: "bg-primary",
      description: "متاجر نشطة",
    },
    {
      title: "المنتجات",
      value: stats.totalProducts,
      icon: Package,
      color: "bg-blue-500",
      description: "منتج متاح",
    },
    {
      title: "إجمالي الطلبات",
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: "bg-orange-500",
      description: "منذ البداية",
    },
    {
      title: "المندوبين",
      value: stats.totalDrivers,
      icon: Users,
      color: "bg-green-500",
      description: "مندوب مسجل",
    },
    {
      title: "طلبات معلقة",
      value: stats.pendingOrders,
      icon: Clock,
      color: "bg-yellow-500",
      description: "تحت الانتظار",
    },
    {
      title: "طلبات اليوم",
      value: stats.todayOrders,
      icon: TrendingUp,
      color: "bg-red-500",
      description: "نشاط اليوم",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat, index) => (
        <Card key={index} className="transition-all hover:shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg ${stat.color}`}>
              <stat.icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? "..." : stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
