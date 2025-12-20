import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, MapPin, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Order {
  id: string;
  status: string;
  total_amount: number;
  delivery_fee: number;
  delivery_address: string;
  notes: string | null;
  created_at: string;
  customer_id: string | null;
  stores?: { name: string };
  profiles?: { full_name: string };
}

const statusOptions = [
  { value: 'pending', label: 'معلق', color: 'bg-warning' },
  { value: 'accepted', label: 'مقبول', color: 'bg-info' },
  { value: 'preparing', label: 'قيد التحضير', color: 'bg-accent' },
  { value: 'ready', label: 'جاهز', color: 'bg-primary' },
  { value: 'picked_up', label: 'في الطريق', color: 'bg-info' },
  { value: 'delivered', label: 'تم التوصيل', color: 'bg-success' },
  { value: 'cancelled', label: 'ملغي', color: 'bg-destructive' },
];

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, stores(name)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الطلبات', variant: 'destructive' });
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const orderToUpdate = orders.find(o => o.id === orderId);
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث حالة الطلب', variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم تحديث حالة الطلب' });
      
      // Send email notification via edge function
      if (orderToUpdate?.customer_id) {
        try {
          await supabase.functions.invoke('send-order-notification', {
            body: {
              order_id: orderId,
              new_status: newStatus,
              customer_id: orderToUpdate.customer_id,
              store_name: orderToUpdate.stores?.name || 'المتجر',
            },
          });
        } catch (notificationError) {
          console.error('Failed to send notification:', notificationError);
        }
      }
      
      fetchOrders();
    }
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find((s) => s.value === status) || statusOptions[0];
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter((o) => o.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">الطلبات</h1>
          <p className="text-muted-foreground">إدارة ومتابعة الطلبات</p>
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="فلترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            return (
              <Card key={order.id} className="animate-fade-in">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-lg">طلب #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">{order.stores?.name}</p>
                    </div>
                    <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {order.delivery_address}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {format(new Date(order.created_at), 'PPp', { locale: ar })}
                  </div>
                  {order.notes && (
                    <p className="text-sm bg-muted p-2 rounded">ملاحظات: {order.notes}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">المجموع</p>
                      <p className="font-bold text-lg">
                        {(order.total_amount + order.delivery_fee).toFixed(2)} ر.س
                      </p>
                      <p className="text-xs text-muted-foreground">
                        (التوصيل: {order.delivery_fee} ر.س)
                      </p>
                    </div>
                    <Select
                      value={order.status}
                      onValueChange={(v) => updateOrderStatus(order.id, v)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
