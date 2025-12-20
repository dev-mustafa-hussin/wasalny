import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StoreOrder, OrderStatus } from "./types";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderActions } from "./OrderActions";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface OrdersTableProps {
  orders: StoreOrder[];
  isLoading: boolean;
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => void;
}

export function OrdersTable({
  orders,
  isLoading,
  onUpdateStatus,
}: OrdersTableProps) {
  if (isLoading && orders.length === 0) {
    return <div className="text-center p-8">جاري تحميل الطلبات...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">لا توجد طلبات حالياً</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right">رقم الطلب</TableHead>
            <TableHead className="text-right">العميل</TableHead>
            <TableHead className="text-right">التاريخ</TableHead>
            <TableHead className="text-right">المبلغ</TableHead>
            <TableHead className="text-center">الحالة</TableHead>
            <TableHead className="text-center">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                #{order.id.slice(0, 8)}
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{order.customer_name}</span>
                  {order.customer_phone && (
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {order.customer_phone}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(order.created_at), "dd MMMM yyyy, hh:mm a", {
                  locale: ar,
                })}
              </TableCell>
              <TableCell>{order.total_amount} د.ع</TableCell>
              <TableCell className="text-center">
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-center">
                <div className="flex justify-center">
                  <OrderActions
                    status={order.status}
                    onUpdateStatus={(newStatus) =>
                      onUpdateStatus(order.id, newStatus)
                    }
                    isLoading={isLoading}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
