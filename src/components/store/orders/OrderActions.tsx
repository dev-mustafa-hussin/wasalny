import { Button } from "@/components/ui/button";
import { Check, X, Package } from "lucide-react";
import { OrderStatus } from "./types";

interface OrderActionsProps {
  status: OrderStatus | string;
  onUpdateStatus: (newStatus: OrderStatus) => void;
  isLoading?: boolean;
}

export function OrderActions({
  status,
  onUpdateStatus,
  isLoading,
}: OrderActionsProps) {
  if (status === "pending") {
    return (
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onUpdateStatus("processing")}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Check className="w-4 h-4 ml-1" />
          قبول
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onUpdateStatus("cancelled")}
          disabled={isLoading}
        >
          <X className="w-4 h-4 ml-1" />
          رفض
        </Button>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <Button
        size="sm"
        onClick={() => onUpdateStatus("ready")}
        disabled={isLoading}
        className="bg-purple-600 hover:bg-purple-700 text-white"
      >
        <Package className="w-4 h-4 ml-1" />
        جاهز للتوصيل
      </Button>
    );
  }

  return null;
}
