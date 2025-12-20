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
import { Plus, Pencil, Trash2, Store, MapPin, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ImageUpload } from '@/components/admin/ImageUpload';

interface StoreType {
  id: string;
  name: string;
  description: string | null;
  type: string;
  image_url: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  opening_time: string | null;
  closing_time: string | null;
}

export default function Stores() {
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'restaurant',
    image_url: '',
    address: '',
    phone: '',
    is_active: true,
    opening_time: '',
    closing_time: '',
  });

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المتاجر', variant: 'destructive' });
    } else {
      setStores(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'restaurant',
      image_url: '',
      address: '',
      phone: '',
      is_active: true,
      opening_time: '',
      closing_time: '',
    });
    setEditingStore(null);
  };

  const handleOpenDialog = (store?: StoreType) => {
    if (store) {
      setEditingStore(store);
      setFormData({
        name: store.name,
        description: store.description || '',
        type: store.type,
        image_url: store.image_url || '',
        address: store.address || '',
        phone: store.phone || '',
        is_active: store.is_active,
        opening_time: store.opening_time || '',
        closing_time: store.closing_time || '',
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const storeData = {
      name: formData.name,
      description: formData.description || null,
      type: formData.type,
      image_url: formData.image_url || null,
      address: formData.address || null,
      phone: formData.phone || null,
      is_active: formData.is_active,
      opening_time: formData.opening_time || null,
      closing_time: formData.closing_time || null,
    };

    if (editingStore) {
      const { error } = await supabase
        .from('stores')
        .update(storeData)
        .eq('id', editingStore.id);

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في تحديث المتجر', variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم تحديث المتجر بنجاح' });
      }
    } else {
      const { error } = await supabase.from('stores').insert(storeData);

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في إضافة المتجر', variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم إضافة المتجر بنجاح' });
      }
    }

    setDialogOpen(false);
    resetForm();
    fetchStores();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المتجر؟')) return;

    const { error } = await supabase.from('stores').delete().eq('id', id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حذف المتجر', variant: 'destructive' });
    } else {
      toast({ title: 'تم', description: 'تم حذف المتجر بنجاح' });
      fetchStores();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">المتاجر</h1>
          <p className="text-muted-foreground">إدارة المطاعم والأسواق</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 ml-2" />
              إضافة متجر
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingStore ? 'تعديل المتجر' : 'إضافة متجر جديد'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المتجر</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">مطعم</SelectItem>
                    <SelectItem value="market">سوق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>صورة المتجر</Label>
                <ImageUpload
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url || '' })}
                  folder="stores"
                />
              </div>
              <div className="space-y-2">
                <Label>العنوان</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>وقت الفتح</Label>
                  <Input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>وقت الإغلاق</Label>
                  <Input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>نشط</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
              </div>
              <Button type="submit" className="w-full">
                {editingStore ? 'تحديث' : 'إضافة'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : stores.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا توجد متاجر بعد</p>
            <Button className="mt-4" onClick={() => handleOpenDialog()}>
              إضافة أول متجر
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Card key={store.id} className="overflow-hidden">
              {store.image_url && (
                <img
                  src={store.image_url}
                  alt={store.name}
                  className="w-full h-40 object-cover"
                />
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={store.type === 'restaurant' ? 'default' : 'secondary'}>
                        {store.type === 'restaurant' ? 'مطعم' : 'سوق'}
                      </Badge>
                      <Badge variant={store.is_active ? 'default' : 'outline'}>
                        {store.is_active ? 'نشط' : 'معطل'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {store.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{store.description}</p>
                )}
                {store.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {store.address}
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {store.phone}
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenDialog(store)}>
                    <Pencil className="h-4 w-4 ml-1" />
                    تعديل
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(store.id)}>
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
