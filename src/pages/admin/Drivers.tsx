import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Car, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface Driver {
  id: string;
  user_id: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  is_available: boolean;
  total_earnings: number;
}

interface Profile {
  user_id: string;
  full_name: string;
  phone: string | null;
}

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    const { data: driversData, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحميل المندوبين', variant: 'destructive' });
    } else {
      setDrivers(driversData || []);
      
      // Fetch profiles for drivers
      if (driversData && driversData.length > 0) {
        const userIds = driversData.map(d => d.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone')
          .in('user_id', userIds);
        
        const profilesMap = new Map<string, Profile>();
        profilesData?.forEach(p => profilesMap.set(p.user_id, p));
        setProfiles(profilesMap);
      }
    }
    setLoading(false);
  };

  const toggleAvailability = async (driverId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('drivers')
      .update({ is_available: !currentStatus })
      .eq('id', driverId);

    if (error) {
      toast({ title: 'خطأ', description: 'فشل في تحديث حالة المندوب', variant: 'destructive' });
    } else {
      fetchDrivers();
    }
  };

  const getProfile = (userId: string) => profiles.get(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المندوبين</h1>
        <p className="text-muted-foreground">إدارة مندوبي التوصيل</p>
      </div>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : drivers.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">لا يوجد مندوبين مسجلين بعد</p>
            <p className="text-sm text-muted-foreground mt-2">
              سيظهر المندوبون هنا بعد تسجيلهم في تطبيق المندوبين
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {drivers.map((driver) => {
            const profile = getProfile(driver.user_id);
            return (
              <Card key={driver.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{profile?.full_name || 'مندوب'}</CardTitle>
                    <Badge variant={driver.is_available ? 'default' : 'outline'}>
                      {driver.is_available ? 'متاح' : 'غير متاح'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {driver.vehicle_type && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Car className="h-4 w-4" />
                      {driver.vehicle_type} - {driver.vehicle_number}
                    </div>
                  )}
                  {profile?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {profile.phone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{driver.total_earnings?.toFixed(2) || '0.00'} ر.س</span>
                    <span className="text-muted-foreground">إجمالي الأرباح</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm">تفعيل/تعطيل</span>
                    <Switch
                      checked={driver.is_available}
                      onCheckedChange={() => toggleAvailability(driver.id, driver.is_available)}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
