import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { 
  MapPin, 
  Package, 
  DollarSign, 
  Clock, 
  Navigation,
  CheckCircle,
  Truck,
  User,
  LogOut,
  Phone,
  Map,
  ChevronDown,
  ChevronUp,
  Settings
} from 'lucide-react';
import { useDriverGPS } from '@/hooks/useDriverGPS';
import { DriverNavigationMap } from '@/components/driver/DriverNavigationMap';

interface Order {
  id: string;
  status: string;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  total_amount: number;
  delivery_fee: number;
  created_at: string;
  notes: string | null;
  store: {
    name: string;
    address: string | null;
  };
  customer: {
    full_name: string;
    phone: string | null;
  } | null;
}

interface DriverInfo {
  id: string;
  is_available: boolean;
  total_earnings: number;
  vehicle_type: string | null;
  vehicle_number: string | null;
}

export default function DriverDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [driverInfo, setDriverInfo] = useState<DriverInfo | null>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const { location, isTracking, startTracking, stopTracking, error: gpsError } = useDriverGPS({
    driverId: driverInfo?.id || '',
    enabled: !!driverInfo?.id
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDriverData();
  }, [user]);

  useEffect(() => {
    if (!driverInfo?.id) return;

    // Subscribe to order changes
    const channel = supabase
      .channel('driver-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverInfo?.id]);

  async function fetchDriverData() {
    if (!user) return;

    try {
      // Get driver info
      const { data: driver, error: driverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (driverError) {
        if (driverError.code === 'PGRST116') {
          toast.error('لم يتم العثور على حساب مندوب');
          navigate('/');
          return;
        }
        throw driverError;
      }

      setDriverInfo(driver);
      await fetchOrders(driver.id);
      await fetchTodayStats(driver.id);
    } catch (error) {
      console.error('Error fetching driver data:', error);
      toast.error('حدث خطأ في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders(driverId?: string) {
    const id = driverId || driverInfo?.id;
    if (!id) return;

    try {
      // Fetch assigned orders (in progress)
      const { data: assigned, error: assignedError } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name, address)
        `)
        .eq('driver_id', id)
        .in('status', ['confirmed', 'preparing', 'ready', 'out_for_delivery'])
        .order('created_at', { ascending: false });

      if (assignedError) throw assignedError;

      // Get customer profiles
      const ordersWithCustomers = await Promise.all(
        (assigned || []).map(async (order) => {
          if (order.customer_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone')
              .eq('user_id', order.customer_id)
              .single();
            return { ...order, customer: profile };
          }
          return { ...order, customer: null };
        })
      );

      setAssignedOrders(ordersWithCustomers);

      // Fetch available orders (ready for pickup, no driver assigned)
      const { data: available, error: availableError } = await supabase
        .from('orders')
        .select(`
          *,
          store:stores(name, address)
        `)
        .is('driver_id', null)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      if (availableError) throw availableError;

      // Add null customer for available orders
      const availableWithCustomer = (available || []).map(order => ({
        ...order,
        customer: null
      }));

      setAvailableOrders(availableWithCustomer);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  }

  async function fetchTodayStats(driverId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const { data: todayOrders, error } = await supabase
        .from('orders')
        .select('delivery_fee')
        .eq('driver_id', driverId)
        .eq('status', 'delivered')
        .gte('created_at', today.toISOString());

      if (error) throw error;

      const earnings = todayOrders?.reduce((sum, o) => sum + (o.delivery_fee || 0), 0) || 0;
      setTodayEarnings(earnings);
      setCompletedToday(todayOrders?.length || 0);
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  }

  async function toggleAvailability() {
    if (!driverInfo) return;

    try {
      const newStatus = !driverInfo.is_available;
      const { error } = await supabase
        .from('drivers')
        .update({ is_available: newStatus })
        .eq('id', driverInfo.id);

      if (error) throw error;

      setDriverInfo({ ...driverInfo, is_available: newStatus });
      toast.success(newStatus ? 'أنت متاح الآن لاستقبال الطلبات' : 'أنت غير متاح حالياً');

      // Auto toggle GPS with availability
      if (newStatus && !isTracking) {
        startTracking();
      } else if (!newStatus && isTracking) {
        stopTracking();
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('حدث خطأ');
    }
  }

  async function acceptOrder(orderId: string) {
    if (!driverInfo) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          driver_id: driverInfo.id,
          status: 'out_for_delivery'
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('تم قبول الطلب');
      fetchOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      toast.error('حدث خطأ في قبول الطلب');
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(
        newStatus === 'delivered' ? 'تم التوصيل بنجاح!' : 'تم تحديث حالة الطلب'
      );
      fetchOrders();
      if (newStatus === 'delivered' && driverInfo) {
        fetchTodayStats(driverInfo.id);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('حدث خطأ');
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-blue-500/20 text-blue-400',
      preparing: 'bg-yellow-500/20 text-yellow-400',
      ready: 'bg-green-500/20 text-green-400',
      out_for_delivery: 'bg-purple-500/20 text-purple-400'
    };

    const labels: Record<string, string> = {
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      ready: 'جاهز للاستلام',
      out_for_delivery: 'في الطريق'
    };

    return (
      <Badge className={styles[status] || 'bg-muted'}>
        {labels[status] || status}
      </Badge>
    );
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">لوحة المندوب</h1>
                <p className="text-xs text-muted-foreground">
                  {driverInfo?.vehicle_type} - {driverInfo?.vehicle_number}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Availability Toggle */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${driverInfo?.is_available ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <div>
                  <p className="font-medium text-foreground">
                    {driverInfo?.is_available ? 'متاح لاستقبال الطلبات' : 'غير متاح'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isTracking ? 'GPS مفعل' : 'GPS غير مفعل'}
                  </p>
                </div>
              </div>
              <Switch 
                checked={driverInfo?.is_available || false}
                onCheckedChange={toggleAvailability}
              />
            </div>
          </CardContent>
        </Card>

        {/* GPS Control */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className={`w-5 h-5 ${isTracking ? 'text-green-500' : 'text-muted-foreground'}`} />
                <div>
                  <p className="font-medium text-foreground">تتبع الموقع</p>
                  {location && (
                    <p className="text-xs text-muted-foreground">
                      آخر تحديث: {location.timestamp.toLocaleTimeString('ar-EG')}
                    </p>
                  )}
                  {gpsError && <p className="text-xs text-destructive">{gpsError}</p>}
                </div>
              </div>
              <Button 
                variant={isTracking ? "destructive" : "default"}
                size="sm"
                onClick={isTracking ? stopTracking : startTracking}
              >
                {isTracking ? 'إيقاف' : 'تفعيل'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-foreground">{todayEarnings.toFixed(2)} ر.س</p>
              <p className="text-xs text-muted-foreground">أرباح اليوم</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold text-foreground">{completedToday}</p>
              <p className="text-xs text-muted-foreground">توصيلات اليوم</p>
            </CardContent>
          </Card>
        </div>

        {/* Total Earnings */}
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
                <p className="text-3xl font-bold text-foreground">
                  {(driverInfo?.total_earnings || 0).toFixed(2)} ر.س
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-500/50" />
            </div>
          </CardContent>
        </Card>

        {/* Assigned Orders */}
        {assignedOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              طلباتي الحالية
            </h2>
            <div className="space-y-3">
              {assignedOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{order.store.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">{order.store.address}</p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-foreground">{order.delivery_address}</p>
                    </div>
                    
                    {order.customer && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{order.customer.full_name}</span>
                        </div>
                        {order.customer.phone && (
                          <a href={`tel:${order.customer.phone}`} className="flex items-center gap-1 text-primary">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{order.customer.phone}</span>
                          </a>
                        )}
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                        ملاحظات: {order.notes}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString('ar-EG')}
                        </span>
                      </div>
                      <p className="font-bold text-green-500">{order.delivery_fee} ر.س</p>
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'out_for_delivery' && (
                        <Button 
                          className="flex-1"
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                        >
                          <CheckCircle className="w-4 h-4 ml-2" />
                          تم التوصيل
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button 
                          className="flex-1"
                          onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                        >
                          <Truck className="w-4 h-4 ml-2" />
                          بدء التوصيل
                        </Button>
                      )}
                      <Button 
                        variant="outline"
                        onClick={() => setExpandedOrderId(
                          expandedOrderId === order.id ? null : order.id
                        )}
                        className="gap-1"
                      >
                        <Map className="w-4 h-4" />
                        {expandedOrderId === order.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Navigation Map */}
                    {expandedOrderId === order.id && order.delivery_lat && order.delivery_lng && (
                      <div className="pt-3">
                        <DriverNavigationMap
                          deliveryLat={order.delivery_lat}
                          deliveryLng={order.delivery_lng}
                          deliveryAddress={order.delivery_address}
                          storeName={order.store.name}
                          storeAddress={order.store.address || undefined}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Available Orders */}
        {driverInfo?.is_available && availableOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-yellow-500" />
              طلبات متاحة للاستلام
            </h2>
            <div className="space-y-3">
              {availableOrders.map((order) => (
                <Card key={order.id} className="border-yellow-500/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{order.store.name}</p>
                        <p className="text-xs text-muted-foreground">{order.store.address}</p>
                      </div>
                      <Badge className="bg-yellow-500/20 text-yellow-400">جديد</Badge>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm text-foreground">{order.delivery_address}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleTimeString('ar-EG')}
                      </span>
                      <p className="font-bold text-green-500">{order.delivery_fee} ر.س</p>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => acceptOrder(order.id)}
                    >
                      قبول الطلب
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {assignedOrders.length === 0 && availableOrders.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-foreground">لا توجد طلبات حالياً</p>
              <p className="text-sm text-muted-foreground">
                {driverInfo?.is_available 
                  ? 'انتظر طلبات جديدة' 
                  : 'قم بتفعيل التوفر لاستقبال الطلبات'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-around py-3">
            <button className="flex flex-col items-center gap-1 text-primary">
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
