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
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
// import { ChatWindow } from "@/components/chat/ChatWindow";
// import { ChatButton } from "@/components/chat/ChatButton";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StarRating } from "@/components/ui/star-rating";
// import { ETACard } from "@/components/customer/ETACard";
// import { CustomerOrderMap } from "@/components/customer/CustomerOrderMap";
import { PushNotificationToggle } from "@/components/customer/PushNotificationToggle";
import { DriverRatingDialog } from "@/components/customer/DriverRatingDialog";
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
  // const [driverRatingExists, setDriverRatingExists] = useState(false); // Unused for now
  // const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  // Fetch driver info for rating dialog
  const { data: driverInfo } = useQuery({
    queryKey: ["driver-info", order?.driver_id],
    queryFn: async () => {
      if (!order?.driver_id) return null;
      const { data: driver } = await supabase
        .from("drivers")
        .select("id, user_id")
        .eq("id", order.driver_id)
        .maybeSingle();

      if (!driver) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", driver.user_id)
        .maybeSingle();

      return { id: driver.id, name: profile?.full_name };
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
    toast.info("Print disabled in debug mode");
  };

  const downloadInvoicePDF = () => {
    toast.info("PDF disabled in debug mode");
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
              {/* Buttons simplified */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadInvoicePDF}
                >
                  Download PDF
                </Button>
              </div>
            </div>

            {/* ETA Card - Show when driver is on the way */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-center text-yellow-700 font-bold">
              ⚠️ Debug Mode: Map & ETA Components Disabled to prevent crash.
            </div>

            {/*
            <ETACard
              orderId={order.id}
              orderStatus={order.status}
              deliveryLat={order.delivery_lat}
              deliveryLng={order.delivery_lng}
              driverId={order.driver_id}
            />
            */}

            {/* Live Map - Show when driver is on the way */}
            {/*
            <CustomerOrderMap
              orderId={order.id}
              orderStatus={order.status}
              deliveryLat={order.delivery_lat}
              deliveryLng={order.delivery_lng}
              driverId={order.driver_id}
            />
            */}

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

            {/* Driver Rating Card */}
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
                  {(() => {
                    try {
                      return format(
                        new Date(order.created_at),
                        "dd MMMM yyyy - HH:mm",
                        {
                          locale: ar,
                        }
                      );
                    } catch (e) {
                      return "تاريخ غير متوفر";
                    }
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Chat System Inline Debug */}
      {order.status !== "pending" && (
        <>
          <button
            onClick={() => setIsChatOpen(true)}
            className="fixed bottom-4 left-4 h-14 w-14 rounded-full shadow-lg z-40 bg-primary text-white flex items-center justify-center hover:bg-primary/90"
          >
            <MessageSquare className="h-7 w-7" />
          </button>

          {isChatOpen && (
            <div className="fixed bottom-4 left-4 w-[350px] h-[500px] bg-background border rounded-xl shadow-2xl flex flex-col z-50">
              <div className="p-4 border-b bg-primary text-primary-foreground rounded-t-xl flex justify-between items-center">
                <h3>المحادثة مع المندوب</h3>
                <button onClick={() => setIsChatOpen(false)}>X</button>
              </div>
              <div className="flex-1 p-4">
                <p className="text-center text-muted-foreground mt-10">
                  نظام المحادثة سيعود قريباً...
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
