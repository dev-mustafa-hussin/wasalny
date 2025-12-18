import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Store, Package, ShoppingCart, Users, TrendingUp, Clock, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

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

    const [stores, products, orders, drivers, pending, todayData, ratedOrdersData, revenueData] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('drivers').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('orders').select('rating').not('rating', 'is', null),
      supabase.from('orders').select('total_amount, created_at').gte('created_at', sevenDaysAgo.toISOString()),
    ]);

    // Calculate rating statistics
    const ratings = ratedOrdersData.data || [];
    const ratedCount = ratings.length;
    const avgRating = ratedCount > 0 
      ? ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedCount 
      : 0;

    // Calculate rating breakdown
    const breakdown = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: ratings.filter(r => r.rating === rating).length,
    }));

    // Calculate daily revenue for last 7 days
    const dailyRevenueMap: Record<string, number> = {};
    const ordersData = revenueData.data || [];
    
    // Initialize all 7 days with 0
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      dailyRevenueMap[dateStr] = 0;
    }

    // Sum up revenue per day
    ordersData.forEach(order => {
      const orderDate = new Date(order.created_at);
      const dateStr = orderDate.toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric' });
      if (dailyRevenueMap[dateStr] !== undefined) {
        dailyRevenueMap[dateStr] += Number(order.total_amount) || 0;
      }
    });

    const dailyRevenue = Object.entries(dailyRevenueMap).map(([date, revenue]) => ({
      date,
      revenue,
    }));

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
    });
    setLoading(false);
  };

  const statCards = [
    { title: 'المتاجر', value: stats.totalStores, icon: Store, color: 'bg-primary' },
    { title: 'المنتجات', value: stats.totalProducts, icon: Package, color: 'bg-info' },
    { title: 'إجمالي الطلبات', value: stats.totalOrders, icon: ShoppingCart, color: 'bg-accent' },
    { title: 'المندوبين', value: stats.totalDrivers, icon: Users, color: 'bg-success' },
    { title: 'طلبات معلقة', value: stats.pendingOrders, icon: Clock, color: 'bg-warning' },
    { title: 'طلبات اليوم', value: stats.todayOrders, icon: TrendingUp, color: 'bg-destructive' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground">نظرة عامة على تطبيق وصلني</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="animate-fade-in">
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
                {loading ? '...' : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rating Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">إحصائيات التقييمات</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500">
              <Star className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-500">
                  {loading ? '...' : stats.averageRating.toFixed(1)}
                </div>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= Math.round(stats.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  متوسط التقييم
                </p>
              </div>
              <div className="h-16 w-px bg-border" />
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {loading ? '...' : stats.ratedOrders}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  طلبات مُقيّمة
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {stats.ratingBreakdown.map((item) => (
                <div key={item.rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{item.rating}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <Progress 
                    value={stats.ratedOrders > 0 ? (item.count / stats.ratedOrders) * 100 : 0} 
                    className="flex-1 h-2"
                  />
                  <span className="text-sm text-muted-foreground w-8">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">إيرادات آخر 7 أيام</CardTitle>
            <div className="p-2 rounded-lg bg-success">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "الإيرادات",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[200px] w-full"
            >
              <BarChart data={stats.dailyRevenue}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value} ر.س`}
                />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={(value) => `${value} ر.س`} />}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>مرحباً بك في لوحة تحكم وصلني</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          <p>من هنا يمكنك:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>إضافة وإدارة المطاعم والأسواق</li>
            <li>إدارة المنتجات والقوائم</li>
            <li>متابعة الطلبات وحالاتها</li>
            <li>إدارة المندوبين</li>
            <li>تحديد أسعار التوصيل</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
