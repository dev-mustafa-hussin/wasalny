import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Palette, Save, Loader2, Type, MessageSquare, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [previewStatus, setPreviewStatus] = useState('delivered');
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

  const getPreviewMessage = () => {
    if (!template) return '';
    const customMessageKey = `custom_message_${previewStatus}` as keyof EmailTemplate;
    const customMessage = template[customMessageKey] as string | null;
    const statusInfo = statusMessages.find(s => s.key === previewStatus);
    return customMessage || statusInfo?.defaultMessage || '';
  };

  const getPreviewStatusLabel = () => {
    return statusMessages.find(s => s.key === previewStatus)?.label || previewStatus;
  };

  const getPreviewSubject = () => {
    if (!template) return '';
    return template.subject_template
      .replace('{order_id}', 'ABC12345')
      .replace('{status}', getPreviewStatusLabel());
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
        <TabsList className="grid w-full grid-cols-4">
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
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 ml-2" />
            معاينة
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

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معاينة الإيميل</CardTitle>
              <CardDescription>شاهد كيف سيظهر الإيميل للعميل</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>اختر الحالة للمعاينة:</Label>
                <Select value={previewStatus} onValueChange={setPreviewStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusMessages.map((status) => (
                      <SelectItem key={status.key} value={status.key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Email Subject Preview */}
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">عنوان الإيميل:</p>
                <p className="font-medium">{getPreviewSubject()}</p>
              </div>

              {/* Full Email Preview */}
              <div className="border rounded-xl overflow-hidden shadow-lg" dir="rtl">
                {/* Header */}
                <div 
                  className="p-6 text-center"
                  style={{ background: `linear-gradient(135deg, ${template.primary_color}, ${template.secondary_color})` }}
                >
                  <h1 className="text-white font-bold text-xl">{template.header_text}</h1>
                </div>

                {/* Content */}
                <div className="bg-white p-6 space-y-4">
                  <p className="text-lg text-gray-800">مرحباً أحمد محمد،</p>
                  <p className="text-gray-600">تم تحديث حالة طلبك:</p>

                  {/* Status Badge */}
                  <div className="text-center py-2">
                    <span 
                      className="inline-block px-5 py-2 rounded-full font-bold text-base"
                      style={{ 
                        backgroundColor: `${template.primary_color}22`,
                        color: template.primary_color 
                      }}
                    >
                      {getPreviewStatusLabel()}
                    </span>
                  </div>

                  {/* Order Info */}
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-gray-600">
                      <strong>رقم الطلب:</strong> ABC12345
                    </p>
                    <p className="text-gray-600">
                      <strong>المتجر:</strong> مطعم البيت السعودي
                    </p>
                    <p className="text-gray-600">
                      <strong>الحالة الجديدة:</strong> {getPreviewStatusLabel()}
                    </p>
                  </div>

                  {/* Status Message */}
                  {getPreviewMessage() && (
                    <div 
                      className="text-center p-4 rounded-lg"
                      style={{ backgroundColor: '#f0f9ff', color: '#1e40af' }}
                    >
                      {getPreviewMessage()}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 border-t p-4 text-center text-gray-500 text-sm space-y-1">
                  <p>{template.footer_text}</p>
                  <p>{template.footer_text_en}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                هذه معاينة تقريبية. قد يختلف الشكل النهائي قليلاً حسب برنامج البريد الإلكتروني المستخدم.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
