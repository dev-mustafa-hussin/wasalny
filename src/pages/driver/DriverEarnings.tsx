import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  Package, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Calendar,
  Star,
  Settings
} from 'lucide-react';

interface EarningsPeriod {
  period: string;
  earnings: number;
  deliveries: number;
}

export default function DriverEarnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [monthEarnings, setMonthEarnings] = useState(0);
  const [dailyBreakdown, setDailyBreakdown] = useState<EarningsPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDriverAndEarnings();
  }, [user]);

  async function fetchDriverAndEarnings() {
    if (!user) return;

    try {
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id, total_earnings')
        .eq('user_id', user.id)
        .single();

      if (driverError) throw driverError;

      setDriverId(driver.id);
      setTotalEarnings(driver.total_earnings || 0);

      // Fetch earnings for different periods
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(todayStart);
      monthStart.setMonth(monthStart.getMonth() - 1);

      // Today's earnings
      const { data: todayData } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driver.id)
        .eq('status', 'delivered')
        .gte('created_at', todayStart.toISOString());

      setTodayEarnings(todayData?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0);

      // Week's earnings
      const { data: weekData } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driver.id)
        .eq('status', 'delivered')
        .gte('created_at', weekStart.toISOString());

      setWeekEarnings(weekData?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0);

      // Month's earnings
      const { data: monthData } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driver.id)
        .eq('status', 'delivered')
        .gte('created_at', monthStart.toISOString());

      setMonthEarnings(monthData?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0);

      // Daily breakdown for last 7 days
      const breakdown: EarningsPeriod[] = [];
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(todayStart);
        dayStart.setDate(dayStart.getDate() - i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const { data: dayData } = await supabase
          .from('orders')
          .select('delivery_fee')
          .eq('driver_id', driver.id)
          .eq('status', 'delivered')
          .gte('created_at', dayStart.toISOString())
          .lt('created_at', dayEnd.toISOString());

        breakdown.push({
          period: dayStart.toLocaleDateString('ar-EG', { weekday: 'short', day: 'numeric' }),
          earnings: dayData?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0,
          deliveries: dayData?.length || 0
        });
      }
      setDailyBreakdown(breakdown);

    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoading(false);
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
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/driver')}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">الأرباح</h1>
              <p className="text-xs text-muted-foreground">تفاصيل أرباحك</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Total Earnings */}
        <Card className="bg-gradient-to-br from-green-500/20 to-emerald-500/10">
          <CardContent className="p-6 text-center">
            <DollarSign className="w-12 h-12 mx-auto mb-3 text-green-500" />
            <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
            <p className="text-4xl font-bold text-foreground">{totalEarnings.toFixed(2)} ر.س</p>
          </CardContent>
        </Card>

        {/* Period Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">اليوم</p>
              <p className="text-xl font-bold text-foreground">{todayEarnings.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">ر.س</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">هذا الأسبوع</p>
              <p className="text-xl font-bold text-foreground">{weekEarnings.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">ر.س</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">هذا الشهر</p>
              <p className="text-xl font-bold text-foreground">{monthEarnings.toFixed(0)}</p>
              <p className="text-xs text-muted-foreground">ر.س</p>
            </CardContent>
          </Card>
        </div>

        {/* Daily Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              آخر 7 أيام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dailyBreakdown.map((day, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="font-medium text-foreground">{day.period}</p>
                  <p className="text-xs text-muted-foreground">{day.deliveries} توصيلة</p>
                </div>
                <p className={`font-bold ${day.earnings > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                  {day.earnings.toFixed(2)} ر.س
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Average Stats */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">متوسط الأرباح اليومية</p>
                <p className="text-xl font-bold text-foreground">
                  {(weekEarnings / 7).toFixed(2)} ر.س
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around py-3">
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground"
              onClick={() => navigate('/driver')}
            >
              <Package className="w-5 h-5" />
              <span className="text-xs">الطلبات</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-primary">
              <DollarSign className="w-5 h-5" />
              <span className="text-xs">الأرباح</span>
            </button>
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground"
              onClick={() => navigate('/driver/history')}
            >
              <Clock className="w-5 h-5" />
              <span className="text-xs">السجل</span>
            </button>
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground"
              onClick={() => navigate('/driver/ratings')}
            >
              <Star className="w-5 h-5" />
              <span className="text-xs">التقييمات</span>
            </button>
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground"
              onClick={() => navigate('/driver/settings')}
            >
              <Settings className="w-5 h-5" />
              <span className="text-xs">الإعدادات</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
