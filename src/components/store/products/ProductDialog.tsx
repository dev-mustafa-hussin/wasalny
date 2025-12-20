import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { StoreProduct } from "@/components/store/orders/types"; // Using shared types file
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(2, "اسم المنتج يجب أن يكون حرفين على الأقل"),
  price: z.coerce.number().min(0.1, "السعر يجب أن يكون أكبر من 0"),
  description: z.string().optional(),
  image_url: z.string().optional(),
  is_available: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  product?: StoreProduct | null;
  isLoading?: boolean;
}

export function ProductDialog({
  isOpen,
  onClose,
  onSubmit,
  product,
  isLoading,
}: ProductDialogProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: 0,
      description: "",
      image_url: "",
      is_available: true,
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        price: product.price,
        description: product.description || "",
        image_url: product.image_url || "",
        is_available: product.is_available,
      });
    } else {
      form.reset({
        name: "",
        price: 0,
        description: "",
        image_url: "",
        is_available: true,
      });
    }
  }, [product, form]);

  const handleSubmit = async (values: ProductFormValues) => {
    await onSubmit(values);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {product ? "تعديل منتج" : "إضافة منتج جديد"}
          </DialogTitle>
          <DialogDescription>
            قم بإدخال تفاصيل المنتج هنا. اضغط حفظ عند الانتهاء.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>اسم المنتج</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: بيتزا مارجريتا" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>السعر (د.ع)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوصف</FormLabel>
                  <FormControl>
                    <Textarea placeholder="وصف مكونات المنتج..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رابط الصورة (اختياري)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>متاح للطلب</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                حفظ التغييرات
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
