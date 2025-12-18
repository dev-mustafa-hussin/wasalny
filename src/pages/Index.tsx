import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Store, Users, Shield } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10" dir="rtl">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16 animate-fade-in">
          <div className="mx-auto w-20 h-20 bg-primary rounded-3xl flex items-center justify-center mb-6">
            <Truck className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">وصلني</h1>
          <p className="text-xl text-muted-foreground mb-8">
            منصة التوصيل الموحدة للمطاعم والأسواق
          </p>
          <Link to="/auth">
            <Button size="lg" className="gap-2">
              <Shield className="h-5 w-5" />
              دخول لوحة التحكم
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <Store className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>المتاجر</CardTitle>
              <CardDescription>إدارة المطاعم والأسواق</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">أضف وأدر المطاعم والأسواق</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-2">
                <Truck className="h-7 w-7 text-accent" />
              </div>
              <CardTitle>التوصيل</CardTitle>
              <CardDescription>متابعة الطلبات</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">تتبع الطلبات وإدارة التوصيل</p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <CardTitle>المندوبين</CardTitle>
              <CardDescription>إدارة فريق التوصيل</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">تواصل مع المندوبين</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
