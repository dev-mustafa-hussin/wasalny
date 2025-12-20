import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Package, 
  DollarSign, 
  Clock, 
  TrendingUp,
  ArrowRight,
  MessageSquare,
  Award,
  Settings
} from 'lucide-react';

interface DriverRating {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  order_id: string;
}

interface RatingStats {
  totalRatings: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
}

export default function DriverRatings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<DriverRating[]>([]);
  const [stats, setStats] = useState<RatingStats>({
    totalRatings: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDriverRatings();
  }, [user]);

  async function fetchDriverRatings() {
    if (!user) return;

    try {
      // Get driver ID
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (driverError) throw driverError;

      setDriverId(driver.id);

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('driver_ratings')
        .select('*')
        .eq('driver_id', driver.id)
        .order('created_at', { ascending: false });

      if (ratingsError) throw ratingsError;

      setRatings(ratingsData || []);

      // Calculate stats
      if (ratingsData && ratingsData.length > 0) {
        const total = ratingsData.length;
        const sum = ratingsData.reduce((acc, r) => acc + r.rating, 0);
        const avg = sum / total;

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingsData.forEach(r => {
          distribution[r.rating] = (distribution[r.rating] || 0) + 1;
        });

        setStats({
          totalRatings: total,
          averageRating: avg,
          ratingDistribution: distribution
        });
      }
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setLoading(false);
    }
  }

  const getRatingLabel = (rating: number) => {
    if (rating >= 4.5) return 'ممتاز';
    if (rating >= 3.5) return 'جيد جداً';
    if (rating >= 2.5) return 'جيد';
    if (rating >= 1.5) return 'مقبول';
    return 'ضعيف';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-500';
    if (rating >= 3) return 'text-yellow-500';
    if (rating >= 2) return 'text-orange-500';
    return 'text-red-500';
  };

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
              <h1 className="font-bold text-foreground">التقييمات</h1>
              <p className="text-xs text-muted-foreground">تقييمات العملاء</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Overall Rating Card */}
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Star className="w-10 h-10 fill-yellow-400 text-yellow-400" />
                  <span className={`text-5xl font-bold ${getRatingColor(stats.averageRating)}`}>
                    {stats.averageRating.toFixed(1)}
                  </span>
                </div>
                <p className="text-lg font-medium text-foreground">{getRatingLabel(stats.averageRating)}</p>
                <p className="text-sm text-muted-foreground">{stats.totalRatings} تقييم</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              توزيع التقييمات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.ratingDistribution[star] || 0;
              const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
              
              return (
                <div key={star} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{star}</span>
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  </div>
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="text-sm text-muted-foreground w-8">{count}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Achievement Badge */}
        {stats.averageRating >= 4.5 && stats.totalRatings >= 10 && (
          <Card className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="p-4 flex items-center gap-4">
              <Award className="w-12 h-12 text-yellow-500" />
              <div>
                <p className="font-bold text-foreground">مندوب متميز!</p>
                <p className="text-sm text-muted-foreground">
                  حصلت على تقييم ممتاز من أكثر من 10 عملاء
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Reviews */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              آخر التعليقات
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ratings.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-muted-foreground">لا توجد تقييمات بعد</p>
                <p className="text-sm text-muted-foreground">قم بتوصيل المزيد من الطلبات للحصول على تقييمات</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ratings.slice(0, 10).map((rating) => (
                  <div 
                    key={rating.id}
                    className="border-b border-border last:border-0 pb-4 last:pb-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star}
                            className={`w-4 h-4 ${
                              star <= rating.rating 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(rating.created_at).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    {rating.comment && (
                      <p className="text-sm text-foreground">"{rating.comment}"</p>
                    )}
                    <Badge variant="secondary" className="mt-2 text-xs">
                      طلب #{rating.order_id.slice(0, 8).toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
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
            <button 
              className="flex flex-col items-center gap-1 text-muted-foreground"
              onClick={() => navigate('/driver/earnings')}
            >
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
            <button className="flex flex-col items-center gap-1 text-primary">
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
