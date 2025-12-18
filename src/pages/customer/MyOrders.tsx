import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'قيد الانتظار', icon: Clock, variant: 'secondary' },
  confirmed: { label: 'تم التأكيد', icon: CheckCircle, variant: 'default' },
  preparing: { label: 'جاري التحضير', icon: Package, variant: 'default' },
  out_for_delivery: { label: 'في الطريق', icon: Truck, variant: 'default' },
  delivered: { label: 'تم التوصيل', icon: CheckCircle, variant: 'outline' },
  cancelled: { label: 'ملغي', icon: XCircle, variant: 'destructive' },
};

export default function MyOrders() {
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          stores (name),
          order_items (*)
        `)
        .eq('customer_id', user?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />

      <div className="container py-6">
        <Link
          to="/"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowRight className="h-4 w-4 ml-1" />
          العودة للرئيسية
        </Link>

        <h1 className="text-2xl font-bold mb-6">طلباتي</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : orders?.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders?.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <Card key={order.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold">{order.stores?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), 'dd MMMM yyyy - HH:mm', {
                            locale: ar,
                          })}
                        </p>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {order.order_items?.length} منتجات
                      </span>
                      <span className="font-bold">
                        {Number(order.total_amount).toFixed(2)} ر.س
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                      {order.delivery_address}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
