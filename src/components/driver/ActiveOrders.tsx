import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  User,
  Phone,
  Clock,
  CheckCircle,
  Truck,
  Map,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Order } from "./types";
import { DriverNavigationMap } from "./DriverNavigationMap";

interface ActiveOrdersProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: string) => void;
}

export function ActiveOrders({ orders, onUpdateStatus }: ActiveOrdersProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: "bg-blue-500/20 text-blue-400",
      preparing: "bg-yellow-500/20 text-yellow-400",
      ready: "bg-green-500/20 text-green-400",
      out_for_delivery: "bg-purple-500/20 text-purple-400",
    };

    const labels: Record<string, string> = {
      confirmed: "مؤكد",
      preparing: "قيد التحضير",
      ready: "جاهز للاستلام",
      out_for_delivery: "في الطريق",
    };

    return (
      <Badge className={styles[status] || "bg-muted"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="overflow-hidden shadow-md border-primary/20"
        >
          <CardHeader className="p-4 pb-2 bg-muted/30">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{order.store.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {order.store.address}
                </p>
              </div>
              {getStatusBadge(order.status)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-3 space-y-4">
            {/* Delivery Info */}
            <div className="flex items-start gap-3 bg-background p-3 rounded-lg border">
              <MapPin className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  عنوان التوصيل
                </p>
                <p className="text-sm text-muted-foreground">
                  {order.delivery_address}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {order.customer && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {order.customer.full_name}
                  </span>
                </div>
                {order.customer.phone && (
                  <Button variant="outline" size="sm" asChild className="h-8">
                    <a
                      href={`tel:${order.customer.phone}`}
                      className="flex items-center gap-2"
                    >
                      <Phone className="w-3 h-3" />
                      <span>اتصال</span>
                    </a>
                  </Button>
                )}
              </div>
            )}

            {order.notes && (
              <div className="text-xs text-muted-foreground bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                <span className="font-bold text-yellow-600">ملاحظات:</span>{" "}
                {order.notes}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleTimeString("ar-EG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded text-sm">
                + {order.delivery_fee} ر.س
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {order.status === "out_for_delivery" && (
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => onUpdateStatus(order.id, "delivered")}
                >
                  <CheckCircle className="w-4 h-4 ml-2" />
                  تسليم الطلب
                </Button>
              )}
              {order.status === "ready" && (
                <Button
                  className="flex-1"
                  onClick={() => onUpdateStatus(order.id, "out_for_delivery")}
                >
                  <Truck className="w-4 h-4 ml-2" />
                  استلام وبدء الرحلة
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  setExpandedOrderId(
                    expandedOrderId === order.id ? null : order.id
                  )
                }
                className="px-3"
              >
                <Map className="w-4 h-4" />
                {expandedOrderId === order.id ? (
                  <ChevronUp className="w-4 h-4 ml-1" />
                ) : (
                  <ChevronDown className="w-4 h-4 ml-1" />
                )}
              </Button>
            </div>

            {/* Navigation Map */}
            {expandedOrderId === order.id &&
              order.delivery_lat &&
              order.delivery_lng && (
                <div className="pt-2 animate-in slide-in-from-top-2">
                  <DriverNavigationMap
                    deliveryLat={order.delivery_lat}
                    deliveryLng={order.delivery_lng}
                    deliveryAddress={order.delivery_address}
                    storeName={order.store.name}
                    storeAddress={order.store.address || undefined}
                    showStore={true}
                  />
                </div>
              )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
