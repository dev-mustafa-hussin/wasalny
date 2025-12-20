import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StoreProduct } from "@/components/store/orders/types";
import { ProductActions } from "./ProductActions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface ProductsTableProps {
  products: StoreProduct[];
  isLoading: boolean;
  onEdit: (product: StoreProduct) => void;
  onDelete: (id: string) => void;
}

export function ProductsTable({
  products,
  isLoading,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  if (isLoading && products.length === 0) {
    return <div className="text-center p-8">جاري تحميل المنتجات...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center p-8 border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">
          لا توجد منتجات حالياً. أضف منتجك الأول!
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">الصورة</TableHead>
            <TableHead className="text-right">الاسم</TableHead>
            <TableHead className="text-right">السعر</TableHead>
            <TableHead className="text-center">الحالة</TableHead>
            <TableHead className="text-center w-[80px]">إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Avatar className="h-10 w-10 rounded-md">
                  <AvatarImage src={product.image_url} alt={product.name} />
                  <AvatarFallback className="rounded-md">
                    {product.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{product.name}</span>
                  {product.description && (
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {product.description}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{product.price} د.ع</TableCell>
              <TableCell className="text-center">
                {product.is_available ? (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 hover:bg-green-100"
                  >
                    متاح
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-red-100 text-red-800 hover:bg-red-100"
                  >
                    غير متاح
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-center">
                <ProductActions
                  onEdit={() => onEdit(product)}
                  onDelete={() => onDelete(product.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
