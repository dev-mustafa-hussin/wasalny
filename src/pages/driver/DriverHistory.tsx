import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Package, 
  Clock, 
  MapPin,
  ArrowRight,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  delivery_fee: number;
  created_at: string;
  rating: number | null;
  store: {
    name: string;
  };
}

export default function DriverHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'delivered' | 'cancelled'>('all');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchHistory();
  }, [user]);

  async function fetchHistory() {
    if (!user) return;

    try {
      const { data: driver } = await supabase
        .from('drivers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!driver) return;

      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          delivery_address,
          delivery_fee,
          created_at,
          rating,
          store:stores(name)
        `)
        .eq('driver_id', driver.id)
        .in('status', ['delivered', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const totalDelivered = orders.filter(o => o.status === 'delivered').length;
  const totalCancelled = orders.filter(o => o.status === 'cancelled').length;
  const averageRating = orders
    .filter(o => o.rating)
    .reduce((sum, o, _, arr) => sum + (o.rating || 0) / arr.length, 0);

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
              <h1 className="font-bold text-foreground">سجل التوصيلات</h1>
              <p className="text-xs text-muted-foreground">جميع طلباتك السابقة</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
              <p className="text-xl font-bold text-foreground">{totalDelivered}</p>
              <p className="text-xs text-muted-foreground">مكتمل</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
              <p className="text-xl font-bold text-foreground">{totalCancelled}</p>
              <p className="text-xs text-muted-foreground">ملغي</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-xl font-bold text-foreground">
                {averageRating ? averageRating.toFixed(1) : '-'}
              </p>
              <p className="text-xs text-muted-foreground">التقييم</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            الكل ({orders.length})
          </Button>
          <Button
            variant={filter === 'delivered' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('delivered')}
          >
            مكتمل ({totalDelivered})
          </Button>
          <Button
            variant={filter === 'cancelled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('cancelled')}
          >
            ملغي ({totalCancelled})
          </Button>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{order.store.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('ar-EG', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge className={
                    order.status === 'delivered' 
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }>
                    {order.status === 'delivered' ? 'مكتمل' : 'ملغي'}
                  </Badge>
                </div>

                <div className="flex items-start gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    {order.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm">{order.rating}</span>
                      </div>
                    )}
                  </div>
                  <p className={`font-bold ${order.status === 'delivered' ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {order.status === 'delivered' ? `+${order.delivery_fee} ر.س` : '-'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-foreground">لا توجد طلبات</p>
              <p className="text-sm text-muted-foreground">ابدأ بتوصيل الطلبات لرؤيتها هنا</p>
            </CardContent>
          </Card>
        )}
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
            <button className="flex flex-col items-center gap-1 text-primary">
              <Clock className="w-5 h-5" />
              <span className="text-xs">السجل</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
