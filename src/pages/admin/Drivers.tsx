import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Users, Car, DollarSign } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحميل المندوبين",
        variant: "destructive",
      });
    } else {
      setDrivers(driversData || []);

      // Fetch profiles for drivers
      if (driversData && driversData.length > 0) {
        const userIds = driversData.map((d) => d.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone")
          .in("user_id", userIds);

        const profilesMap = new Map<string, Profile>();
        profilesData?.forEach((p) => profilesMap.set(p.user_id, p));
        setProfiles(profilesMap);
      }
    }
    setLoading(false);
  };

  const toggleAvailability = async (
    driverId: string,
    currentStatus: boolean
  ) => {
    const { error } = await supabase
      .from("drivers")
      .update({ is_available: !currentStatus })
      .eq("id", driverId);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة المندوب",
        variant: "destructive",
      });
    } else {
      fetchDrivers();
    }
  };

  const getProfile = (userId: string) => profiles.get(userId);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredDrivers = drivers.filter((driver) => {
    const profile = getProfile(driver.user_id);
    const matchesSearch =
      (profile?.full_name || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (driver.vehicle_number || "").includes(searchQuery);

    if (activeTab === "available") return matchesSearch && driver.is_available;
    if (activeTab === "offline") return matchesSearch && !driver.is_available;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">المندوبين</h1>
          <p className="text-muted-foreground">إدارة ومتابعة مندوبي التوصيل</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Input
              placeholder="بحث خن اسم أو رقم السيارة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "all" ? "default" : "ghost"}
          onClick={() => setActiveTab("all")}
          className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          data-state={activeTab === "all" ? "active" : "inactive"}
        >
          الكل ({drivers.length})
        </Button>
        <Button
          variant={activeTab === "available" ? "default" : "ghost"}
          onClick={() => setActiveTab("available")}
          className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 data-[state=active]:bg-green-100 data-[state=active]:border-green-500"
          data-state={activeTab === "available" ? "active" : "inactive"}
        >
          نشط ({drivers.filter((d) => d.is_available).length})
        </Button>
        <Button
          variant={activeTab === "offline" ? "default" : "ghost"}
          onClick={() => setActiveTab("offline")}
          className="text-muted-foreground hover:text-foreground"
          data-state={activeTab === "offline" ? "active" : "inactive"}
        >
          غير متاح ({drivers.filter((d) => !d.is_available).length})
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">جاري التحميل...</div>
      ) : filteredDrivers.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">لا يوجد مندوبين مطابقين</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDrivers.map((driver) => {
            const profile = getProfile(driver.user_id);
            return (
              <Card
                key={driver.id}
                className={`transition-all ${
                  driver.is_available ? "border-green-200 bg-green-50/10" : ""
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          driver.is_available
                            ? "bg-green-500 animate-pulse"
                            : "bg-gray-300"
                        }`}
                      />
                      <CardTitle className="text-lg">
                        {profile?.full_name || "مندوب"}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={driver.is_available ? "default" : "secondary"}
                      className={
                        driver.is_available
                          ? "bg-green-500 hover:bg-green-600"
                          : ""
                      }
                    >
                      {driver.is_available ? "متاح للعمل" : "خارج الخدمة"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs">
                        السيارة
                      </span>
                      <div className="flex items-center gap-1 font-medium">
                        <Car className="h-3 w-3" />
                        {driver.vehicle_type || "-"}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-xs">
                        رقم اللوحة
                      </span>
                      <div className="font-medium">
                        {driver.vehicle_number || "-"}
                      </div>
                    </div>
                  </div>

                  {profile?.phone && (
                    <div className="text-sm bg-muted/50 p-2 rounded flex justify-between items-center">
                      <span className="text-muted-foreground">الجوال:</span>
                      <span className="font-mono dir-ltr">{profile.phone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="font-bold text-lg">
                      {driver.total_earnings?.toFixed(2) || "0.00"}
                    </span>
                    <span className="text-xs text-muted-foreground self-end mb-1">
                      ر.س (أرباح)
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      تغيير الحالة يدوياً
                    </span>
                    <Switch
                      checked={driver.is_available}
                      onCheckedChange={() =>
                        toggleAvailability(driver.id, driver.is_available)
                      }
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
