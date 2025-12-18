import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Palette, Save, Loader2, Type, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface EmailTemplate {
  id: string;
  template_key: string;
  subject_template: string;
  header_text: string;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  footer_text_en: string;
  custom_message_pending: string | null;
  custom_message_confirmed: string | null;
  custom_message_preparing: string | null;
  custom_message_ready: string | null;
  custom_message_out_for_delivery: string | null;
  custom_message_delivered: string | null;
  custom_message_cancelled: string | null;
}

const statusMessages = [
  { key: 'pending', label: 'قيد الانتظار', defaultMessage: 'تم استلام طلبك وسيتم مراجعته قريباً.' },
  { key: 'confirmed', label: 'تم التأكيد', defaultMessage: 'تم تأكيد طلبك وسيبدأ التحضير.' },
  { key: 'preparing', label: 'جاري التحضير', defaultMessage: 'طلبك قيد التحضير الآن.' },
  { key: 'ready', label: 'جاهز', defaultMessage: 'طلبك جاهز وسيتم تسليمه للمندوب قريباً!' },
  { key: 'out_for_delivery', label: 'في الطريق', defaultMessage: 'المندوب في طريقه إليك الآن!' },
  { key: 'delivered', label: 'تم التوصيل', defaultMessage: 'تم توصيل طلبك بنجاح! نتمنى أن تكون راضياً عن الخدمة.' },
  { key: 'cancelled', label: 'ملغي', defaultMessage: 'نأسف لإلغاء طلبك. نتمنى خدمتك مرة أخرى.' },
];

export default function EmailTemplates() {
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplate();
  }, []);

  const fetchTemplate = async () => {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'order_status')
      .maybeSingle();

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل قالب البريد', variant: 'destructive' });
    } else if (data) {
      setTemplate(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!template) return;

    setSaving(true);
    const { error } = await supabase
      .from('email_templates')
      .update({
        subject_template: template.subject_template,
        header_text: template.header_text,
        primary_color: template.primary_color,
        secondary_color: template.secondary_color,
        footer_text: template.footer_text,
        footer_text_en: template.footer_text_en,
        custom_message_pending: template.custom_message_pending,
        custom_message_confirmed: template.custom_message_confirmed,
        custom_message_preparing: template.custom_message_preparing,
        custom_message_ready: template.custom_message_ready,
        custom_message_out_for_delivery: template.custom_message_out_for_delivery,
        custom_message_delivered: template.custom_message_delivered,
        custom_message_cancelled: template.custom_message_cancelled,
      })
      .eq('id', template.id);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ التغييرات', variant: 'destructive' });
    } else {
      toast({ title: 'تم الحفظ', description: 'تم حفظ قالب البريد الإلكتروني بنجاح' });
    }
    setSaving(false);
  };

  const updateField = (field: keyof EmailTemplate, value: string) => {
    if (template) {
      setTemplate({ ...template, [field]: value });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <Mail className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">لم يتم العثور على قالب البريد الإلكتروني</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">قوالب البريد الإلكتروني</h1>
          <p className="text-muted-foreground">تخصيص رسائل الإشعارات للعملاء</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 ml-2" />
          )}
          حفظ التغييرات
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">
            <Type className="h-4 w-4 ml-2" />
            عام
          </TabsTrigger>
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 ml-2" />
            الألوان
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="h-4 w-4 ml-2" />
            الرسائل
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات العامة</CardTitle>
              <CardDescription>تخصيص العناوين والنصوص الأساسية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">عنوان الإيميل</Label>
                <Input
                  id="subject"
                  value={template.subject_template}
                  onChange={(e) => updateField('subject_template', e.target.value)}
                  placeholder="تحديث طلبك #{order_id} - {status}"
                  dir="rtl"
                />
                <p className="text-xs text-muted-foreground">
                  يمكنك استخدام {'{order_id}'} لرقم الطلب و {'{status}'} للحالة
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="header">عنوان الرسالة</Label>
                <Input
                  id="header"
                  value={template.header_text}
                  onChange={(e) => updateField('header_text', e.target.value)}
                  placeholder="وصلني - Waslni"
                  dir="rtl"
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="footer">نص التذييل (عربي)</Label>
                <Input
                  id="footer"
                  value={template.footer_text}
                  onChange={(e) => updateField('footer_text', e.target.value)}
                  placeholder="شكراً لاستخدامك وصلني"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerEn">نص التذييل (إنجليزي)</Label>
                <Input
                  id="footerEn"
                  value={template.footer_text_en}
                  onChange={(e) => updateField('footer_text_en', e.target.value)}
                  placeholder="Thank you for using Waslni"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ألوان القالب</CardTitle>
              <CardDescription>تخصيص ألوان الرسالة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">اللون الأساسي</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={template.primary_color}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.primary_color}
                      onChange={(e) => updateField('primary_color', e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">اللون الثانوي</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={template.secondary_color}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={template.secondary_color}
                      onChange={(e) => updateField('secondary_color', e.target.value)}
                      placeholder="#1d4ed8"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="p-4 rounded-lg" style={{ background: `linear-gradient(135deg, ${template.primary_color}, ${template.secondary_color})` }}>
                <p className="text-white text-center font-bold text-lg">{template.header_text}</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">معاينة رأس الرسالة</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>رسائل الحالات</CardTitle>
              <CardDescription>تخصيص الرسائل لكل حالة طلب (اتركها فارغة لاستخدام الرسائل الافتراضية)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {statusMessages.map((status) => (
                <div key={status.key} className="space-y-2">
                  <Label htmlFor={`msg-${status.key}`}>{status.label}</Label>
                  <Textarea
                    id={`msg-${status.key}`}
                    value={template[`custom_message_${status.key}` as keyof EmailTemplate] as string || ''}
                    onChange={(e) => updateField(`custom_message_${status.key}` as keyof EmailTemplate, e.target.value)}
                    placeholder={status.defaultMessage}
                    dir="rtl"
                    rows={2}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
