import { Badge } from "@/components/ui/badge";
import { OrderStatus } from "./types";

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "processing":
        return "bg-blue-500 hover:bg-blue-600";
      case "ready":
        return "bg-purple-500 hover:bg-purple-600";
      case "delivering":
        return "bg-indigo-500 hover:bg-indigo-600";
      case "delivered":
        return "bg-green-500 hover:bg-green-600";
      case "cancelled":
        return "bg-red-500 hover:bg-red-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "قيد الانتظار",
      processing: "جاري التحضير",
      ready: "جاهز للاستلام",
      delivering: "جاري التوصيل",
      delivered: "تم التوصيل",
      cancelled: "ملغي",
    };
    return labels[status] || status;
  };

  return (
    <Badge
      className={`${getStatusColor(status as string)} text-white border-0`}
    >
      {getStatusLabel(status as string)}
    </Badge>
  );
}
