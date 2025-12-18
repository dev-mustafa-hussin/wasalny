import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Package, Clock, CheckCircle, Truck, XCircle, ChefHat, MapPin, Phone, Loader2, Star, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { StarRating } from '@/components/ui/star-rating';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

const statusSteps = [
  { key: 'pending', label: 'قيد الانتظار', icon: Clock, description: 'تم استلام طلبك' },
  { key: 'confirmed', label: 'تم التأكيد', icon: CheckCircle, description: 'المتجر يجهز طلبك' },
  { key: 'preparing', label: 'جاري التحضير', icon: ChefHat, description: 'طلبك قيد التحضير' },
  { key: 'out_for_delivery', label: 'في الطريق', icon: Truck, description: 'المندوب في طريقه إليك' },
  { key: 'delivered', label: 'تم التوصيل', icon: CheckCircle, description: 'تم توصيل طلبك بنجاح' },
];

// Statuses that allow cancellation
const cancellableStatuses = ['pending', 'confirmed'];

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          stores (name, phone, address),
          order_items (*)
        `)
        .eq('id', id)
        .eq('customer_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Real-time subscription for order updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Order updated:', payload);
          queryClient.invalidateQueries({ queryKey: ['order-tracking', id] });
          
          const newStatus = payload.new.status;
          const statusInfo = statusSteps.find(s => s.key === newStatus);
          
          if (statusInfo && newStatus !== 'cancelled') {
            toast.success('تحديث حالة الطلب', {
              description: statusInfo.description,
              duration: 5000,
            });
          } else if (newStatus === 'cancelled') {
            toast.error('تم إلغاء الطلب');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const handleCancelOrder = async () => {
    if (!id) return;
    
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .eq('customer_id', user?.id);

      if (error) throw error;

      toast.success('تم إلغاء الطلب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['order-tracking', id] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('فشل في إلغاء الطلب');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!id || rating === 0) return;
    
    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ rating })
        .eq('id', id)
        .eq('customer_id', user?.id);

      if (error) throw error;

      toast.success('شكراً لتقييمك!');
      queryClient.invalidateQueries({ queryKey: ['order-tracking', id] });
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('فشل في إرسال التقييم');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    if (order.status === 'cancelled') return -1;
    return statusSteps.findIndex(s => s.key === order.status);
  };

  const canCancel = order && cancellableStatuses.includes(order.status);
  const currentStep = getCurrentStepIndex();

  const printInvoice = () => {
    if (!order) return;

    const subtotal = Number(order.total_amount) - Number(order.delivery_fee);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const invoiceHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة الطلب #${order.id.slice(0, 8).toUpperCase()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { font-size: 12px; color: #666; }
          .order-info { margin-bottom: 15px; font-size: 13px; }
          .order-info p { margin: 5px 0; }
          .store-info { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
          .store-info h3 { font-size: 14px; margin-bottom: 5px; }
          .store-info p { font-size: 12px; color: #666; }
          .items { border-top: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 10px 0; margin: 15px 0; }
          .item { display: flex; justify-content: space-between; margin: 8px 0; font-size: 13px; }
          .totals { margin-top: 15px; }
          .totals .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 13px; }
          .totals .total { font-weight: bold; font-size: 16px; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
          .address { background: #f9f9f9; padding: 10px; border-radius: 5px; margin: 15px 0; font-size: 12px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; border-top: 2px dashed #333; padding-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>وصلني</h1>
          <p>فاتورة طلب</p>
        </div>
        
        <div class="order-info">
          <p><strong>رقم الطلب:</strong> ${order.id.slice(0, 8).toUpperCase()}</p>
          <p><strong>التاريخ:</strong> ${format(new Date(order.created_at), 'dd/MM/yyyy - HH:mm')}</p>
        </div>

        <div class="store-info">
          <h3>${order.stores?.name || 'المتجر'}</h3>
          ${order.stores?.address ? `<p>${order.stores.address}</p>` : ''}
          ${order.stores?.phone ? `<p>هاتف: ${order.stores.phone}</p>` : ''}
        </div>

        <div class="address">
          <strong>عنوان التوصيل:</strong><br>
          ${order.delivery_address}
          ${order.notes ? `<br><br><strong>ملاحظات:</strong> ${order.notes}` : ''}
        </div>

        <div class="items">
          <strong>المنتجات:</strong>
          ${order.order_items?.map((item: any) => `
            <div class="item">
              <span>${item.product_name} × ${item.quantity}</span>
              <span>${(item.unit_price * item.quantity).toFixed(2)} ر.س</span>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="row">
            <span>المجموع الفرعي</span>
            <span>${subtotal.toFixed(2)} ر.س</span>
          </div>
          <div class="row">
            <span>رسوم التوصيل</span>
            <span>${Number(order.delivery_fee).toFixed(2)} ر.س</span>
          </div>
          <div class="row total">
            <span>المجموع الكلي</span>
            <span>${Number(order.total_amount).toFixed(2)} ر.س</span>
          </div>
        </div>

        <div class="footer">
          <p>شكراً لاستخدامك وصلني</p>
          <p>نتمنى لك تجربة سعيدة!</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-background">
      <CustomerHeader />

      <div className="container py-6">
        <Link
          to="/my-orders"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowRight className="h-4 w-4 ml-1" />
          العودة لطلباتي
        </Link>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-48 rounded-lg" />
          </div>
        ) : !order ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">الطلب غير موجود</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl font-bold">تتبع الطلب</h1>
                <p className="text-muted-foreground">
                  رقم الطلب: {order.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={printInvoice}>
                  <Printer className="h-4 w-4 ml-1" />
                  طباعة الفاتورة
                </Button>
                {order.status === 'cancelled' ? (
                  <Badge variant="destructive" className="text-base px-4 py-1">
                    <XCircle className="h-4 w-4 ml-1" />
                    ملغي
                  </Badge>
                ) : canCancel ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={isCancelling}>
                        {isCancelling ? (
                          <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 ml-1" />
                        )}
                        إلغاء الطلب
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>هل أنت متأكد من إلغاء الطلب؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم إلغاء طلبك نهائياً ولا يمكن التراجع عن هذا الإجراء.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>تراجع</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelOrder}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          نعم، إلغاء الطلب
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </div>

            {/* Status Timeline */}
            {order.status !== 'cancelled' && (
              <Card>
                <CardContent className="p-6">
                  <div className="relative">
                    {statusSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isCompleted = index <= currentStep;
                      const isCurrent = index === currentStep;

                      return (
                        <div key={step.key} className="flex items-start gap-4 mb-6 last:mb-0">
                          <div className="relative">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isCompleted
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              } ${isCurrent ? 'ring-4 ring-primary/20' : ''}`}
                            >
                              <StepIcon className="h-5 w-5" />
                            </div>
                            {index < statusSteps.length - 1 && (
                              <div
                                className={`absolute top-10 right-1/2 w-0.5 h-10 -translate-x-1/2 ${
                                  index < currentStep ? 'bg-primary' : 'bg-muted'
                                }`}
                              />
                            )}
                          </div>
                          <div className="flex-1 pt-1.5">
                            <p className={`font-medium ${isCompleted ? '' : 'text-muted-foreground'}`}>
                              {step.label}
                            </p>
                            <p className="text-sm text-muted-foreground">{step.description}</p>
                          </div>
                          {isCurrent && (
                            <Badge variant="default" className="animate-pulse">
                              الحالة الحالية
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Rating Card - Show only for delivered orders */}
            {order.status === 'delivered' && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    {order.rating ? 'تقييمك للطلب' : 'قيّم تجربتك'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.rating ? (
                    <div className="text-center">
                      <StarRating value={order.rating} readonly size="lg" />
                      <p className="text-muted-foreground mt-2">شكراً لتقييمك!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">كيف كانت تجربتك مع هذا الطلب؟</p>
                      <div className="flex justify-center">
                        <StarRating value={rating} onChange={setRating} size="lg" />
                      </div>
                      <Button
                        className="w-full"
                        onClick={handleSubmitRating}
                        disabled={rating === 0 || isSubmittingRating}
                      >
                        {isSubmittingRating ? (
                          <>
                            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                            جاري الإرسال...
                          </>
                        ) : (
                          'إرسال التقييم'
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">تفاصيل الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{order.stores?.name}</p>
                    {order.stores?.address && (
                      <p className="text-sm text-muted-foreground">{order.stores.address}</p>
                    )}
                  </div>
                </div>

                {order.stores?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a href={`tel:${order.stores.phone}`} className="text-primary">
                      {order.stores.phone}
                    </a>
                  </div>
                )}

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">عنوان التوصيل</p>
                    <p className="text-muted-foreground">{order.delivery_address}</p>
                  </div>
                </div>

                {order.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="font-medium mb-1">ملاحظات</p>
                      <p className="text-muted-foreground">{order.notes}</p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <p className="font-medium mb-2">المنتجات</p>
                  <div className="space-y-2">
                    {order.order_items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.product_name} × {item.quantity}
                        </span>
                        <span>{(item.unit_price * item.quantity).toFixed(2)} ر.س</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي</span>
                    <span>{(Number(order.total_amount) - Number(order.delivery_fee)).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>رسوم التوصيل</span>
                    <span>{Number(order.delivery_fee).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2">
                    <span>المجموع</span>
                    <span>{Number(order.total_amount).toFixed(2)} ر.س</span>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground pt-2">
                  تاريخ الطلب:{' '}
                  {format(new Date(order.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
