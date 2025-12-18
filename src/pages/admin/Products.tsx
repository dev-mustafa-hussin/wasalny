import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  store_id: string;
  category_id: string | null;
  stores?: { name: string };
}

interface StoreOption {
  id: string;
  name: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    image_url: '',
    is_available: true,
    store_id: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchStores();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*, stores(name)')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المنتجات', variant: 'destructive' });
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const fetchStores = async () => {
    const { data } = await supabase.from('stores').select('id, name').eq('is_active', true);
    setStores(data || []);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      image_url: '',
      is_available: true,
      store_id: '',
    });
    setEditingProduct(null);
  };

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        image_url: product.image_url || '',
        is_available: product.is_available,
        store_id: product.store_id,
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      image_url: formData.image_url || null,
      is_available: formData.is_available,
      store_id: formData.store_id,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.id);

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في تحديث المنتج', variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث المنتج بنجاح' });
      }
    } else {
      const { error } = await supabase.from('products').insert(productData);

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في إضافة المنتج', variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة المنتج بنجاح' });
      }
    }

    setDialogOpen(false);
    resetForm();
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    const { error } = await supabase.from('products').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المنتج', variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف المنتج بنجاح' });
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المنتجات</h1>
          <p className="text-muted-foreground">إدارة منتجات المتاجر</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} disabled={stores.length === 0}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة منتج
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>المتجر</Label>
                <Select value={formData.store_id} onValueChange={(v) => setFormData({ ...formData, store_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المتجر" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اسم المنتج</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>السعر</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>رابط الصورة</Label>
                <Input
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>متاح</Label>
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(v) => setFormData({ ...formData, is_available: v })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!formData.store_id}>
                {editingProduct ? 'تحديث' : 'إضافة'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {stores.length === 0 && (
        <Card>
          <CardContent className="py-4 text-center text-warning">
            يجب إضافة متجر أولاً قبل إضافة المنتجات
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد منتجات بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              {product.image_url && (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-32 object-cover"
                />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{product.name}</CardTitle>
                  <Badge variant={product.is_available ? 'default' : 'outline'}>
                    {product.is_available ? 'متاح' : 'غير متاح'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{product.stores?.name}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                <p className="text-lg font-bold text-primary">{product.price} ر.س</p>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(product)}>
                    <Pencil className="h-4 w-4 ml-1" />
                    تعديل
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(product.id)}>
                    <Trash2 className="h-4 w-4 ml-1" />
                    حذف
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
