import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock } from "lucide-react";
import { Order } from "./types";

interface AvailableOrdersProps {
  orders: Order[];
  onAccept: (orderId: string) => void;
}

export function AvailableOrders({ orders, onAccept }: AvailableOrdersProps) {
  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="border-yellow-500/30 overflow-hidden hover:border-yellow-500/50 transition-colors"
        >
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-foreground text-lg">
                  {order.store.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {order.store.address}
                </p>
              </div>
              <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-0">
                جديد
              </Badge>
            </div>

            <div className="flex items-start gap-2 bg-muted/30 p-2 rounded">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-foreground leading-snug">
                {order.delivery_address}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(order.created_at).toLocaleTimeString("ar-EG", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <p className="font-bold text-green-500">
                {order.delivery_fee} ر.س
              </p>
            </div>

            <Button
              className="w-full bg-primary hover:bg-primary/90 font-bold"
              size="lg"
              onClick={() => onAccept(order.id)}
            >
              قبول الطلب
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
