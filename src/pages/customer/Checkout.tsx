import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, CreditCard, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { LocationPicker } from "@/components/common/LocationPicker";

const checkoutSchema = z.object({
  address: z.string().min(5, "يرجى تحديد موقع التوصيل"),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { items, getTotal, clearCart, getCurrentStoreId } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      address: "",
      notes: "",
    },
  });

  const subtotal = getTotal();
  const deliveryFee = 10; // Base delivery fee
  const total = subtotal + deliveryFee;

  const handleLocationSelect = useCallback(
    (loc: { lat: number; lng: number; address: string }) => {
      setCoordinates({ lat: loc.lat, lng: loc.lng });
      form.setValue("address", loc.address, { shouldValidate: true });
    },
    [form]
  );

  const onSubmit = async (data: CheckoutForm) => {
    if (!user || items.length === 0) return;

    if (!coordinates) {
      toast.error("يرجى تحديد الموقع على الخريطة");
      return;
    }

    setIsSubmitting(true);
    try {
      const storeId = getCurrentStoreId();
      if (!storeId) throw new Error("Store not found");

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          store_id: storeId,
          delivery_address: data.address,
          delivery_lat: coordinates.lat,
          delivery_lng: coordinates.lng,
          notes: data.notes || null,
          total_amount: total,
          delivery_fee: deliveryFee,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearCart();
      toast.success("تم إرسال طلبك بنجاح!", {
        description: "يمكنك تتبع طلبك الآن على الخريطة",
      });
      navigate(`/order-success/${order.id}`);
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("حدث خطأ أثناء إرسال الطلب");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <CustomerHeader />

      <div className="container py-6">
        <Link
          to="/cart"
          className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowRight className="h-4 w-4 ml-1" />
          العودة للسلة
        </Link>

        <h1 className="text-2xl font-bold mb-6">إتمام الطلب</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Checkout Form */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  موقع التوصيل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <LocationPicker onLocationSelect={handleLocationSelect} />

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان (يتم تحديده تلقائياً)</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              readOnly
                              className="bg-muted resize-none"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ملاحظات إضافية (اختياري)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="أي تعليمات خاصة للتوصيل أو الطلب..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  طريقة الدفع
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="font-medium">الدفع عند الاستلام</p>
                  <p className="text-sm text-muted-foreground">
                    ادفع نقداً عند استلام طلبك
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle>ملخص الطلب</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.productName} × {item.quantity}
                      </span>
                      <span>{(item.price * item.quantity).toFixed(2)} ر.س</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toFixed(2)} ر.س</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>رسوم التوصيل</span>
                  <span>{deliveryFee.toFixed(2)} ر.س</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>المجموع</span>
                  <span>{total.toFixed(2)} ر.س</span>
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      جاري إرسال الطلب...
                    </>
                  ) : (
                    "تأكيد الطلب"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
