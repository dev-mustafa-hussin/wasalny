import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import { toast } from "sonner";

export default function Contact() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.");
  };

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">تواصل معنا</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Contact Info */}
        <div className="space-y-6">
          <div className="bg-primary/5 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4 text-primary">
              معلومات التواصل
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-primary h-5 w-5" />
                <p>الرياض، المملكة العربية السعودية</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-primary h-5 w-5" />
                <p>+966 50 000 0000</p>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="text-primary h-5 w-5" />
                <p>support@wasalny.com</p>
              </div>
            </div>
          </div>

          <div className="bg-muted p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">ساعات العمل</h2>
            <p>يومياً من الساعة 9 صباحاً حتى 12 منتصف الليل</p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-6">أرسل لنا رسالة</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" placeholder="اسمك الكامل" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@mail.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">الموضوع</Label>
              <Input id="subject" placeholder="عنوان الرسالة" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">الرسالة</Label>
              <Textarea
                id="message"
                placeholder="اكتب رسالتك هنا..."
                className="h-32"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              <Send className="ml-2 h-4 w-4" />
              إرسال الرسالة
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
