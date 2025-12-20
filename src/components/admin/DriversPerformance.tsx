import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Truck, 
  TrendingUp, 
  TrendingDown,
  Package,
  DollarSign,
  Clock,
  Award
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

interface DriverPerformance {
  id: string;
  user_id: string;
  name: string;
  totalDeliveries: number;
  totalEarnings: number;
  averageRating: number;
  totalRatings: number;
  completedToday: number;
  is_available: boolean;
}

export default function DriversPerformance() {
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [topDrivers, setTopDrivers] = useState<DriverPerformance[]>([]);

  useEffect(() => {
    fetchDriversPerformance();
  }, []);

  async function fetchDriversPerformance() {
    try {
      // Fetch all drivers
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('id, user_id, is_available, total_earnings');

      if (driversError) throw driversError;

      // Fetch all profiles for names
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p.full_name]) || []);

      // Fetch all ratings
      const { data: ratingsData } = await supabase
        .from('driver_ratings')
        .select('driver_id, rating');

      // Calculate ratings per driver
      const ratingsMap = new Map<string, { sum: number; count: number }>();
      ratingsData?.forEach(r => {
        const existing = ratingsMap.get(r.driver_id) || { sum: 0, count: 0 };
        ratingsMap.set(r.driver_id, {
          sum: existing.sum + r.rating,
          count: existing.count + 1
        });
      });

      // Fetch today's orders
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: ordersData } = await supabase
        .from('orders')
        .select('driver_id, status, delivery_fee')
        .eq('status', 'delivered');

      const { data: todayOrdersData } = await supabase
        .from('orders')
        .select('driver_id')
        .eq('status', 'delivered')
        .gte('created_at', todayStart.toISOString());

      // Calculate deliveries per driver
      const deliveriesMap = new Map<string, number>();
      ordersData?.forEach(o => {
        if (o.driver_id) {
          deliveriesMap.set(o.driver_id, (deliveriesMap.get(o.driver_id) || 0) + 1);
        }
      });

      const todayDeliveriesMap = new Map<string, number>();
      todayOrdersData?.forEach(o => {
        if (o.driver_id) {
          todayDeliveriesMap.set(o.driver_id, (todayDeliveriesMap.get(o.driver_id) || 0) + 1);
        }
      });

      // Build performance data
      const performance: DriverPerformance[] = (driversData || []).map(driver => {
        const ratings = ratingsMap.get(driver.id) || { sum: 0, count: 0 };
        return {
          id: driver.id,
          user_id: driver.user_id,
          name: profilesMap.get(driver.user_id) || 'مندوب غير معروف',
          totalDeliveries: deliveriesMap.get(driver.id) || 0,
          totalEarnings: driver.total_earnings || 0,
          averageRating: ratings.count > 0 ? ratings.sum / ratings.count : 0,
          totalRatings: ratings.count,
          completedToday: todayDeliveriesMap.get(driver.id) || 0,
          is_available: driver.is_available || false
        };
      });

      // Sort by rating, then by deliveries
      const sorted = [...performance].sort((a, b) => {
        if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
        return b.totalDeliveries - a.totalDeliveries;
      });

      setDrivers(sorted);
      setTopDrivers(sorted.slice(0, 5));
    } catch (error) {
      console.error('Error fetching drivers performance:', error);
    } finally {
      setLoading(false);
    }
  }

  const getRatingBadge = (rating: number) => {
    if (rating >= 4.5) return { label: 'ممتاز', variant: 'default' as const, color: 'bg-green-500' };
    if (rating >= 3.5) return { label: 'جيد جداً', variant: 'secondary' as const, color: 'bg-blue-500' };
    if (rating >= 2.5) return { label: 'جيد', variant: 'outline' as const, color: 'bg-yellow-500' };
    return { label: 'يحتاج تحسين', variant: 'destructive' as const, color: 'bg-red-500' };
  };

  const totalDeliveries = drivers.reduce((sum, d) => sum + d.totalDeliveries, 0);
  const totalEarnings = drivers.reduce((sum, d) => sum + d.totalEarnings, 0);
  const activeDrivers = drivers.filter(d => d.is_available).length;
  const avgRating = drivers.length > 0 
    ? drivers.filter(d => d.totalRatings > 0).reduce((sum, d) => sum + d.averageRating, 0) / 
      drivers.filter(d => d.totalRatings > 0).length || 0
    : 0;

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي التوصيلات
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDeliveries}</div>
            <p className="text-xs text-muted-foreground">من جميع المندوبين</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الأرباح
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEarnings.toFixed(0)} ر.س</div>
            <p className="text-xs text-muted-foreground">رسوم التوصيل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              المندوبين النشطين
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDrivers} / {drivers.length}</div>
            <p className="text-xs text-muted-foreground">متاحين الآن</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              متوسط التقييم
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {avgRating.toFixed(1)}
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs text-muted-foreground">من التقييمات</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Drivers Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-yellow-500" />
            أفضل المندوبين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topDrivers.length > 0 ? (
            <ChartContainer
              config={{
                deliveries: { label: 'التوصيلات', color: 'hsl(var(--primary))' },
                rating: { label: 'التقييم', color: 'hsl(var(--success))' }
              }}
              className="h-[300px]"
            >
              <BarChart data={topDrivers.map(d => ({
                name: d.name.split(' ')[0],
                deliveries: d.totalDeliveries,
                rating: d.averageRating * 20
              }))}>
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="deliveries" fill="var(--color-deliveries)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-center text-muted-foreground py-8">لا توجد بيانات كافية</p>
          )}
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            جميع المندوبين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-4 font-medium">المندوب</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                  <th className="text-right py-3 px-4 font-medium">التوصيلات</th>
                  <th className="text-right py-3 px-4 font-medium">الأرباح</th>
                  <th className="text-right py-3 px-4 font-medium">التقييم</th>
                  <th className="text-right py-3 px-4 font-medium">اليوم</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver, index) => {
                  const ratingBadge = getRatingBadge(driver.averageRating);
                  return (
                    <tr key={driver.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {index < 3 && (
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500 text-white' :
                              index === 1 ? 'bg-gray-400 text-white' :
                              'bg-orange-500 text-white'
                            }`}>
                              {index + 1}
                            </span>
                          )}
                          <span className="font-medium">{driver.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={driver.is_available ? 'default' : 'secondary'}>
                          {driver.is_available ? 'متاح' : 'غير متاح'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">{driver.totalDeliveries}</td>
                      <td className="py-3 px-4">{driver.totalEarnings.toFixed(0)} ر.س</td>
                      <td className="py-3 px-4">
                        {driver.totalRatings > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span>{driver.averageRating.toFixed(1)}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              ({driver.totalRatings})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{driver.completedToday}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
