import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash } from "lucide-react";

interface ProductActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function ProductActions({
  onEdit,
  onDelete,
  isDeleting,
}: ProductActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">فتح القائمة</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="ml-2 h-4 w-4" />
          تعديل
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onDelete}
          className="text-red-600 focus:text-red-600 focus:bg-red-50"
          disabled={isDeleting}
        >
          <Trash className="ml-2 h-4 w-4" />
          حذف
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
