import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Store, Package, ShoppingCart, Users, TrendingUp, Clock } from 'lucide-react';

interface Stats {
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalDrivers: number;
  pendingOrders: number;
  todayOrders: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStores: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalDrivers: 0,
    pendingOrders: 0,
    todayOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [stores, products, orders, drivers, pending, todayData] = await Promise.all([
      supabase.from('stores').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }),
      supabase.from('drivers').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    ]);

    setStats({
      totalStores: stores.count || 0,
      totalProducts: products.count || 0,
      totalOrders: orders.count || 0,
      totalDrivers: drivers.count || 0,
      pendingOrders: pending.count || 0,
      todayOrders: todayData.count || 0,
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
