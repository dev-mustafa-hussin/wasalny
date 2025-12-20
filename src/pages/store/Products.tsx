import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductsTable } from "@/components/store/products/ProductsTable";
import { ProductDialog } from "@/components/store/products/ProductDialog";
import { StoreProduct } from "@/components/store/orders/types";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function StoreProducts() {
  const queryClient = useQueryClient();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // 1. Fetch Store ID
  useEffect(() => {
    const fetchStore = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Mock fetching store
      const { data: firstStore } = await supabase
        .from("stores")
        .select("id")
        .limit(1)
        .single();
      if (firstStore) setStoreId(firstStore.id);
    };
    fetchStore();
  }, []);

  // 2. Fetch Products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store-products", storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as StoreProduct[];
    },
    enabled: !!storeId,
  });

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: async (newProduct: Omit<StoreProduct, "id" | "created_at">) => {
      if (!storeId) throw new Error("No store ID");
      const { error } = await supabase
        .from("products")
        .insert({ ...newProduct, store_id: storeId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إضافة المنتج بنجاح");
      queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
      setIsDialogOpen(false);
    },
    onError: () => toast.error("حدث خطأ أثناء إضافة المنتج"),
  });

  const updateMutation = useMutation({
    mutationFn: async (product: Partial<StoreProduct> & { id: string }) => {
      const { id, ...updates } = product;
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم تحديث المنتج بنجاح");
      queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
      setIsDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: () => toast.error("حدث خطأ أثناء تحديث المنتج"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم حذف المنتج بنجاح");
      queryClient.invalidateQueries({ queryKey: ["store-products", storeId] });
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    },
    onError: () => toast.error("حدث خطأ أثناء حذف المنتج"),
  });

  const handleSubmit = async (values: any) => {
    if (selectedProduct) {
      updateMutation.mutate({ ...values, id: selectedProduct.id });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleEdit = (product: StoreProduct) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setProductToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete);
    }
  };

  if (!storeId) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>تنبيه</AlertTitle>
          <AlertDescription>
            لم يتم العثور على متجر مرتبط بحسابك.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">المنتجات</h2>
          <p className="text-muted-foreground mt-1">
            أضف وعدل قائمة منتجاتك من هنا
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedProduct(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="ml-2 h-4 w-4" />
          إضافة منتج
        </Button>
      </div>

      <ProductsTable
        products={products}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      <ProductDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSubmit={handleSubmit}
        product={selectedProduct}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف المنتج نهائياً.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
