import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, User, Car, Save, Loader2, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DriverAvatarUpload } from "@/components/driver/DriverAvatarUpload";

interface DriverProfile {
  full_name: string;
  phone: string;
  avatar_url: string | null;
}

interface DriverVehicle {
  vehicle_type: string;
  vehicle_number: string;
}

const DriverSettings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [profile, setProfile] = useState<DriverProfile>({
    full_name: "",
    phone: "",
    avatar_url: null,
  });

  const [vehicle, setVehicle] = useState<DriverVehicle>({
    vehicle_type: "motorcycle",
    vehicle_number: "",
  });

  const fetchDriverData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileData) {
        setProfile({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
          avatar_url: profileData.avatar_url,
        });
      }

      // Fetch driver/vehicle data
      const { data: driverData } = await supabase
        .from("drivers")
        .select("vehicle_type, vehicle_number")
        .eq("user_id", user.id)
        .maybeSingle();

      if (driverData) {
        setVehicle({
          vehicle_type: driverData.vehicle_type || "motorcycle",
          vehicle_number: driverData.vehicle_number || "",
        });
      }
    } catch (error) {
      console.error("Error fetching driver data:", error);
      toast.error("حدث خطأ في جلب البيانات");
    } finally {
      setLoading(false);
    }
  }, [user, setProfile, setVehicle, setLoading]);

  useEffect(() => {
    if (user) {
      fetchDriverData();
    }
  }, [user, fetchDriverData]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Update driver/vehicle info
      const { error: driverError } = await supabase
        .from("drivers")
        .update({
          vehicle_type: vehicle.vehicle_type,
          vehicle_number: vehicle.vehicle_number,
        })
        .eq("user_id", user.id);

      if (driverError) throw driverError;

      // Update password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
          setSaving(false);
          return;
        }

        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) throw passwordError;
        setNewPassword("");
        toast.success("تم تحديث كلمة المرور");
      }

      toast.success("تم حفظ التغييرات بنجاح");
    } catch (error) {
      console.error("Error saving data:", error);
      toast.error("حدث خطأ في حفظ البيانات");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/driver")}
            className="text-primary-foreground hover:bg-primary/80"
          >
            <ArrowRight className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">الإعدادات</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="w-5 h-5 text-primary" />
              المعلومات الشخصية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Avatar Upload */}
            {user && (
              <DriverAvatarUpload
                avatarUrl={profile.avatar_url}
                fullName={profile.full_name}
                userId={user.id}
                onAvatarChange={(url) =>
                  setProfile((prev) => ({ ...prev, avatar_url: url }))
                }
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, full_name: e.target.value }))
                }
                placeholder="أدخل اسمك الكامل"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="text-right"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="w-5 h-5 text-primary" />
              معلومات المركبة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">نوع المركبة</Label>
              <Select
                value={vehicle.vehicle_type}
                onValueChange={(value) =>
                  setVehicle((prev) => ({ ...prev, vehicle_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع المركبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="motorcycle">دراجة نارية</SelectItem>
                  <SelectItem value="car">سيارة</SelectItem>
                  <SelectItem value="bicycle">دراجة هوائية</SelectItem>
                  <SelectItem value="van">فان</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicle_number">رقم المركبة</Label>
              <Input
                id="vehicle_number"
                value={vehicle.vehicle_number}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    vehicle_number: e.target.value,
                  }))
                }
                placeholder="أدخل رقم لوحة المركبة"
                dir="ltr"
                className="text-right"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security: Change Password */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="w-5 h-5 text-primary" />
              الأمان وكلمة المرور
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">كلمة المرور الجديدة</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="اتركها فارغة إذا لم ترد التغيير"
                dir="ltr"
                className="text-right"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
          size="lg"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري الحفظ...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              حفظ التغييرات
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default DriverSettings;
