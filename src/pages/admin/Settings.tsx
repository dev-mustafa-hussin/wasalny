import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Save, Bell } from 'lucide-react';

interface DeliverySettings {
  id: string;
  base_price: number;
  price_per_km: number;
  min_order_amount: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('orderSoundNotifications');
    return stored !== 'false'; // Default to true
  });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    base_price: '',
    price_per_km: '',
    min_order_amount: '',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('delivery_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل الإعدادات', variant: 'destructive' });
    } else if (data) {
      setSettings(data);
      setFormData({
        base_price: data.base_price?.toString() || '10',
        price_per_km: data.price_per_km?.toString() || '2',
        min_order_amount: data.min_order_amount?.toString() || '20',
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const updateData = {
      base_price: parseFloat(formData.base_price),
      price_per_km: parseFloat(formData.price_per_km),
      min_order_amount: parseFloat(formData.min_order_amount),
    };

    if (settings?.id) {
      const { error } = await supabase
        .from('delivery_settings')
        .update(updateData)
        .eq('id', settings.id);

      if (error) {
        toast({ title: 'خطأ', description: 'فشل في حفظ الإعدادات', variant: 'destructive' });
      } else {
        toast({ title: 'تم', description: 'تم حفظ الإعدادات بنجاح' });
      }
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إعدادات التوصيل والأسعار</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            إعدادات التوصيل
          </CardTitle>
          <CardDescription>تحديد أسعار ورسوم التوصيل</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>السعر الأساسي للتوصيل (ر.س)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  الرسوم الثابتة لكل طلب توصيل
                </p>
              </div>
              <div className="space-y-2">
                <Label>السعر لكل كيلومتر (ر.س)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price_per_km}
                  onChange={(e) => setFormData({ ...formData, price_per_km: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  رسوم إضافية بناءً على المسافة
                </p>
              </div>
              <div className="space-y-2">
                <Label>الحد الأدنى للطلب (ر.س)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  أقل قيمة للطلب المسموح بها
                </p>
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 ml-2" />
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            إعدادات الإشعارات
          </CardTitle>
          <CardDescription>التحكم في إشعارات الطلبات</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>الإشعارات الصوتية</Label>
              <p className="text-sm text-muted-foreground">
                تشغيل صوت عند وصول طلب جديد
              </p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={(checked) => {
                setSoundEnabled(checked);
                localStorage.setItem('orderSoundNotifications', String(checked));
                toast({
                  title: checked ? 'تم تفعيل الإشعارات الصوتية' : 'تم إيقاف الإشعارات الصوتية',
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>معلومات التطبيق</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>اسم التطبيق:</strong> وصلني</p>
          <p><strong>الإصدار:</strong> 1.0.0</p>
          <p><strong>النوع:</strong> تطبيق توصيل (مطاعم + أسواق)</p>
        </CardContent>
      </Card>
    </div>
  );
}
