import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          stores (name),
          order_items (*)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />

      <div className="container py-12">
        {isLoading ? (
          <div className="max-w-md mx-auto space-y-4">
            <Skeleton className="h-24 w-24 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : order ? (
          <div className="max-w-md mx-auto text-center">
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <h1 className="text-2xl font-bold mb-2">تم إرسال طلبك بنجاح!</h1>
            <p className="text-muted-foreground mb-6">
              رقم الطلب: {order.id.slice(0, 8).toUpperCase()}
            </p>

            <Card className="text-right mb-6">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{order.stores?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.order_items?.length} منتجات
                    </p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-1">عنوان التوصيل</p>
                  <p>{order.delivery_address}</p>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span>المجموع</span>
                    <span className="font-bold">{Number(order.total_amount).toFixed(2)} ر.س</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              <Button asChild>
                <Link to="/my-orders">متابعة طلباتي</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/">
                  <ArrowRight className="h-4 w-4 ml-1" />
                  العودة للرئيسية
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground">الطلب غير موجود</p>
        )}
      </div>
    </div>
  );
}
