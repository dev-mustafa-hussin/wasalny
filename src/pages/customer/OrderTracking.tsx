import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  ChefHat,
  MapPin,
  Phone,
  Loader2,
  Star,
  Printer,
  Download,
  UserCheck,
  Ban,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/ui/star-rating";
import { ETACard } from "@/components/customer/ETACard";
import { CustomerOrderMap } from "@/components/customer/CustomerOrderMap";
import { PushNotificationToggle } from "@/components/customer/PushNotificationToggle";
import { DriverRatingDialog } from "@/components/customer/DriverRatingDialog";
import { DriverInfoCard } from "@/components/customer/DriverInfoCard";
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
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";

const statusSteps = [
  {
    key: "pending",
    label: "قيد الانتظار",
    icon: Clock,
    description: "تم استلام طلبك",
  },
  {
    key: "confirmed",
    label: "تم التأكيد",
    icon: CheckCircle,
    description: "المتجر يجهز طلبك",
  },
  {
    key: "preparing",
    label: "جاري التحضير",
    icon: ChefHat,
    description: "طلبك قيد التحضير",
  },
  {
    key: "out_for_delivery",
    label: "في الطريق",
    icon: Truck,
    description: "المندوب في طريقه إليك",
  },
  {
    key: "delivered",
    label: "تم التوصيل",
    icon: CheckCircle,
    description: "تم توصيل طلبك بنجاح",
  },
];

// Statuses that allow cancellation
const cancellableStatuses = ["pending", "confirmed"];

type DriverLocation = { lat: number; lng: number };

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCancelling, setIsCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showDriverRatingDialog, setShowDriverRatingDialog] = useState(false);
  const [driverRatingExists, setDriverRatingExists] = useState(false);
  // const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-tracking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          stores (name, phone, address),
          order_items (*)
        `
        )
        .eq("id", id)
        .eq("customer_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Check if driver rating exists
  const { data: driverRating, refetch: refetchDriverRating } = useQuery({
    queryKey: ["driver-rating", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_ratings")
        .select("*")
        .eq("order_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!order?.driver_id && order?.status === "delivered",
  });

  // Fetch driver info
  const { data: driverInfo } = useQuery({
    queryKey: ["driver-info", order?.driver_id],
    queryFn: async () => {
      if (!order?.driver_id) return null;

      const { data: driver } = await supabase
        .from("drivers")
        .select("id, user_id, vehicle_type, vehicle_number")
        .eq("id", order.driver_id)
        .maybeSingle();

      if (!driver) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", driver.user_id)
        .maybeSingle();

      return {
        id: driver.id,
        name: profile?.full_name,
        phone: profile?.phone,
        vehicleType: driver.vehicle_type,
        vehicleNumber: driver.vehicle_number,
      };
    },
    enabled: !!order?.driver_id,
  });

  // Real-time subscription for order updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log("Order updated:", payload);
          queryClient.invalidateQueries({ queryKey: ["order-tracking", id] });

          const newStatus = payload.new.status;
          const statusInfo = statusSteps.find((s) => s.key === newStatus);

          if (statusInfo && newStatus !== "cancelled") {
            toast.success("تحديث حالة الطلب", {
              description: statusInfo.description,
              duration: 5000,
            });
          } else if (newStatus === "cancelled") {
            toast.error("تم إلغاء الطلب");
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
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("customer_id", user?.id);

      if (error) throw error;

      toast.success("تم إلغاء الطلب بنجاح");
      queryClient.invalidateQueries({ queryKey: ["order-tracking", id] });
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("فشل في إلغاء الطلب");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!id || rating === 0) return;

    setIsSubmittingRating(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ rating })
        .eq("id", id)
        .eq("customer_id", user?.id);

      if (error) throw error;

      toast.success("شكراً لتقييمك!");
      queryClient.invalidateQueries({ queryKey: ["order-tracking", id] });
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("فشل في إرسال التقييم");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    if (order.status === "cancelled") return -1;
    return statusSteps.findIndex((s) => s.key === order.status);
  };

  const canCancel = order && cancellableStatuses.includes(order.status);
  const currentStep = getCurrentStepIndex();

  const printInvoice = () => {
    if (!order) return;

    const subtotal = Number(order.total_amount) - Number(order.delivery_fee);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("يرجى السماح بالنوافذ المنبثقة للطباعة");
      return;
    }

    const invoiceHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>فاتورة طلب #${order.id.slice(0, 8).toUpperCase()}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          body { font-family: 'Cairo', sans-serif; background: #f3f4f6; padding: 20px; }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            background: #fff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.15);
          }
          
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
          .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
          .invoice-title { font-size: 24px; color: #333; }
          
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-bottom: 40px; }
          .info-box h3 { margin: 0 0 10px; color: #666; font-size: 14px; }
          .info-box p { margin: 0; font-weight: 600; color: #333; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f8fafc; color: #64748b; padding: 12px; text-align: right; font-weight: 600; }
          td { padding: 12px; border-bottom: 1px solid #eee; color: #333; }
          tr:last-child td { border-bottom: none; }
          
          .totals { margin-left: auto; width: 300px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .total-row.final { border-top: 2px solid #333; border-bottom: none; margin-top: 10px; padding-top: 10px; font-size: 18px; font-weight: bold; }
          
          .footer { text-align: center; margin-top: 50px; color: #9ca3af; font-size: 12px; }
          
          @media print {
            body { background: #fff; padding: 0; }
            .invoice-box { box-shadow: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="logo">وصلني</div>
            <div class="invoice-title">فاتورة ضريبية</div>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>بيانات الطلب</h3>
              <p>رقم الطلب: #${order.id.slice(0, 8).toUpperCase()}</p>
              <p>التاريخ: ${format(
                new Date(order.created_at),
                "dd/MM/yyyy - hh:mm a"
              )}</p>
              <p>حالة الطلب: ${
                statusSteps.find((s) => s.key === order.status)?.label ||
                order.status
              }</p>
            </div>
            <div class="info-box">
              <h3>بيانات العميل</h3>
              <p>${user?.user_metadata?.full_name || "عميل وصلني"}</p>
              <p>${order.delivery_address}</p>
              ${order.customer?.phone ? `<p>${order.customer.phone}</p>` : ""}
            </div>
            <div class="info-box">
              <h3>بيانات المتجر</h3>
              <p>${order.stores?.name}</p>
              ${order.stores?.address ? `<p>${order.stores.address}</p>` : ""}
              ${order.stores?.phone ? `<p>${order.stores.phone}</p>` : ""}
            </div>
            ${
              order.notes
                ? `
            <div class="info-box">
              <h3>ملاحظات</h3>
              <p>${order.notes}</p>
            </div>`
                : ""
            }
          </div>
          
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${order.order_items
                ?.map(
                  (item: any) => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit_price} ر.س</td>
                  <td>${(item.unit_price * item.quantity).toFixed(2)} ر.س</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row">
              <span>المجموع الفرعي</span>
              <span>${subtotal.toFixed(2)} ر.س</span>
            </div>
            <div class="total-row">
              <span>رسوم التوصيل</span>
              <span>${Number(order.delivery_fee).toFixed(2)} ر.س</span>
            </div>
            <div class="total-row final">
              <span>الإجمالي الكلي</span>
              <span>${Number(order.total_amount).toFixed(2)} ر.س</span>
            </div>
          </div>
          
          <div class="footer">
            <p>شكراً لاستخدامكم تطبيق وصلني</p>
            <p>رقم التسجيل الضريبي: 300123456789003</p>
          </div>
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

  const downloadInvoicePDF = () => {
    if (!order) return;

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const subtotal = Number(order.total_amount) - Number(order.delivery_fee);

    // Header
    doc.setFontSize(22);
    doc.text("Waslni", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text("Order Invoice", 105, 28, { align: "center" });

    // Line
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    // Order info
    doc.setFontSize(11);
    doc.text(`Order ID: ${order.id.slice(0, 8).toUpperCase()}`, 20, 45);
    try {
      doc.text(
        `Date: ${format(new Date(order.created_at), "dd/MM/yyyy - HH:mm")}`,
        20,
        52
      );
    } catch (e) {
      doc.text(`Date: N/A`, 20, 52);
    }

    // Store info
    doc.setFontSize(12);
    doc.text("Store Information:", 20, 65);
    doc.setFontSize(10);
    doc.text(`Name: ${order.stores?.name || "N/A"}`, 25, 72);
    if (order.stores?.address)
      doc.text(`Address: ${order.stores.address}`, 25, 79);
    if (order.stores?.phone) doc.text(`Phone: ${order.stores.phone}`, 25, 86);

    // Delivery info
    doc.setFontSize(12);
    doc.text("Delivery Information:", 20, 100);
    doc.setFontSize(10);
    doc.text(`Address: ${order.delivery_address}`, 25, 107);
    if (order.notes) doc.text(`Notes: ${order.notes}`, 25, 114);

    // Products table header
    let yPos = order.notes ? 130 : 125;
    doc.setFontSize(12);
    doc.text("Products:", 20, yPos);
    yPos += 8;

    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, 170, 8, "F");
    doc.setFontSize(10);
    doc.text("Product", 25, yPos);
    doc.text("Qty", 120, yPos);
    doc.text("Price", 145, yPos);
    doc.text("Total", 170, yPos);
    yPos += 8;

    // Products
    order.order_items?.forEach((item: any) => {
      doc.text(item.product_name.substring(0, 35), 25, yPos);
      doc.text(String(item.quantity), 120, yPos);
      doc.text(`${item.unit_price} SAR`, 145, yPos);
      doc.text(
        `${(item.unit_price * item.quantity).toFixed(2)} SAR`,
        170,
        yPos
      );
      yPos += 7;
    });

    // Totals
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    doc.text(`Subtotal: ${subtotal.toFixed(2)} SAR`, 145, yPos);
    yPos += 7;
    doc.text(
      `Delivery Fee: ${Number(order.delivery_fee).toFixed(2)} SAR`,
      145,
      yPos
    );
    yPos += 7;
    doc.setFontSize(12);
    doc.text(`Total: ${Number(order.total_amount).toFixed(2)} SAR`, 145, yPos);

    // Footer
    yPos += 20;
    doc.setFontSize(10);
    doc.text("Thank you for using Waslni!", 105, yPos, { align: "center" });

    doc.save(`invoice-${order.id.slice(0, 8).toUpperCase()}.pdf`);
    toast.success("تم تحميل الفاتورة");
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadInvoicePDF}
                >
                  <Download className="h-4 w-4 ml-1" />
                  تحميل PDF
                </Button>
                <Button variant="outline" size="sm" onClick={printInvoice}>
                  <Printer className="h-4 w-4 ml-1" />
                  طباعة
                </Button>
                {order.status === "cancelled" ? (
                  <Badge variant="destructive" className="text-base px-4 py-1">
                    <XCircle className="h-4 w-4 ml-1" />
                    ملغي
                  </Badge>
                ) : canCancel ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isCancelling}
                      >
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
                        <AlertDialogTitle>
                          هل أنت متأكد من إلغاء الطلب؟
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          سيتم إلغاء طلبك نهائياً ولا يمكن التراجع عن هذا
                          الإجراء.
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

            {/* ETA Card - Show when driver is on the way */}
            <ETACard
              orderId={order.id}
              orderStatus={order.status}
              deliveryLat={order.delivery_lat}
              deliveryLng={order.delivery_lng}
              driverId={order.driver_id}
            />

            {/* Driver Info - Show when driver is assigned */}
            {driverInfo && (
              <DriverInfoCard
                driverName={driverInfo.name || "مندوب وصلني"}
                driverPhone={driverInfo.phone}
                vehicleType={driverInfo.vehicleType}
                vehicleNumber={driverInfo.vehicleNumber}
              />
            )}

            {/* Live Map - Show when driver is on the way */}
            <CustomerOrderMap
              orderId={order.id}
              orderStatus={order.status}
              deliveryLat={order.delivery_lat}
              deliveryLng={order.delivery_lng}
              driverId={order.driver_id}
            />

            {/* Push Notifications */}
            <PushNotificationToggle />

            {/* Status Timeline */}
            {order.status !== "cancelled" && (
              <Card>
                <CardContent className="p-6">
                  <div className="relative">
                    {statusSteps.map((step, index) => {
                      const StepIcon = step.icon;
                      const isCompleted = index <= currentStep;
                      const isCurrent = index === currentStep;

                      return (
                        <div
                          key={step.key}
                          className="flex items-start gap-4 mb-6 last:mb-0"
                        >
                          <div className="relative">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isCompleted
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                            >
                              <StepIcon className="h-5 w-5" />
                            </div>
                            {index < statusSteps.length - 1 && (
                              <div
                                className={`absolute top-10 right-1/2 w-0.5 h-10 -translate-x-1/2 ${
                                  index < currentStep
                                    ? "bg-primary"
                                    : "bg-muted"
                                }`}
                              />
                            )}
                          </div>
                          <div className="flex-1 pt-1.5">
                            <p
                              className={`font-medium ${
                                isCompleted ? "" : "text-muted-foreground"
                              }`}
                            >
                              {step.label}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {step.description}
                            </p>
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
            {order.status === "delivered" && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    {order.rating ? "تقييمك للطلب" : "قيّم تجربتك"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.rating ? (
                    <div className="text-center">
                      <StarRating value={order.rating} readonly size="lg" />
                      <p className="text-muted-foreground mt-2">
                        شكراً لتقييمك!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        كيف كانت تجربتك مع هذا الطلب؟
                      </p>
                      <div className="flex justify-center">
                        <StarRating
                          value={rating}
                          onChange={setRating}
                          size="lg"
                        />
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
                          "إرسال التقييم"
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Driver Rating Card - Show only for delivered orders with a driver */}
            {order.status === "delivered" && order.driver_id && driverInfo && (
              <Card className="border-green-500/50 bg-green-500/5">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-green-500" />
                    {driverRating ? "تقييمك للمندوب" : "قيّم المندوب"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {driverRating ? (
                    <div className="text-center space-y-2">
                      <StarRating
                        value={driverRating.rating}
                        readonly
                        size="lg"
                      />
                      {driverRating.comment && (
                        <p className="text-sm text-muted-foreground">
                          "{driverRating.comment}"
                        </p>
                      )}
                      <p className="text-muted-foreground mt-2">
                        شكراً لتقييمك للمندوب!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        كيف كانت تجربتك مع المندوب {driverInfo.name || ""}؟
                      </p>
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => setShowDriverRatingDialog(true)}
                      >
                        <Star className="h-4 w-4 ml-2" />
                        قيّم المندوب
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Driver Rating Dialog */}
            {order.driver_id && driverInfo && (
              <DriverRatingDialog
                open={showDriverRatingDialog}
                onOpenChange={setShowDriverRatingDialog}
                orderId={order.id}
                driverId={driverInfo.id}
                driverName={driverInfo.name}
                onRatingSubmitted={() => refetchDriverRating()}
              />
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
                      <p className="text-sm text-muted-foreground">
                        {order.stores.address}
                      </p>
                    )}
                  </div>
                </div>

                {order.stores?.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <a
                      href={`tel:${order.stores.phone}`}
                      className="text-primary"
                    >
                      {order.stores.phone}
                    </a>
                  </div>
                )}

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">عنوان التوصيل</p>
                    <p className="text-muted-foreground">
                      {order.delivery_address}
                    </p>
                  </div>
                </div>

                {order.notes && (
                  <>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <div className="font-medium min-w-[60px]">ملاحظات:</div>
                      <div className="text-muted-foreground">{order.notes}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">المنتجات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.order_items?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        الكمية: {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">
                      {(item.unit_price * item.quantity).toFixed(2)} ر.س
                    </p>
                  </div>
                ))}

                <div className="pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>المجموع الفرعي</span>
                    <span>
                      {(
                        Number(order.total_amount) - Number(order.delivery_fee)
                      ).toFixed(2)}{" "}
                      ر.س
                    </span>
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
                  تاريخ الطلب:{" "}
                  {format(new Date(order.created_at), "dd MMMM yyyy - HH:mm", {
                    locale: ar,
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
