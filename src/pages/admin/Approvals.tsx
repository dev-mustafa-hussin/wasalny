import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Store, Car, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Approvals() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    setLoading(true);
    // Fetch pending drivers
    const { data: driversData, error: driversError } = await supabase
      .from("drivers")
      .select("*, profiles(full_name, phone_number)")
      .eq("status", "pending");

    if (driversError) console.error("Error fetching drivers:", driversError);
    else setDrivers(driversData || []);

    // Fetch pending stores
    const { data: storesData, error: storesError } = await supabase
      .from("stores")
      .select("*")
      .eq("status", "pending");

    if (storesError) console.error("Error fetching stores:", storesError);
    else setStores(storesData || []);

    setLoading(false);
  };

  const handleApprove = async (id: string, type: "driver" | "store") => {
    const table = type === "driver" ? "drivers" : "stores";
    const { error } = await supabase
      .from(table)
      .update({ status: "approved" })
      .eq("id", id);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الموافقة",
        variant: "destructive",
      });
    } else {
      toast({ title: "تم بنجاح", description: "تمت الموافقة على الطلب" });
      fetchPendingItems();
    }
  };

  const handleReject = async (id: string, type: "driver" | "store") => {
    const table = type === "driver" ? "drivers" : "stores";
    const { error } = await supabase
      .from(table)
      .update({ status: "rejected" })
      .eq("id", id);

    if (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء الرفض",
        variant: "destructive",
      });
    } else {
      toast({ title: "تم بنجاح", description: "تم رفض الطلب" });
      fetchPendingItems();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">طلبات الانضمام</h1>
        <Button variant="outline" onClick={fetchPendingItems}>
          تحديث
        </Button>
      </div>

      <Tabs defaultValue="drivers" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="drivers" className="flex gap-2">
            <Car className="h-4 w-4" />
            مناديب قيد الانتظار
            {drivers.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {drivers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stores" className="flex gap-2">
            <Store className="h-4 w-4" />
            متاجر قيد الانتظار
            {stores.length > 0 && (
              <Badge variant="secondary" className="mr-2">
                {stores.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="drivers" className="space-y-4 mt-4">
          {drivers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              لا يوجد طلبات مناديب جديدة
            </div>
          ) : (
            drivers.map((driver) => (
              <Card key={driver.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {driver.profiles?.full_name || "غير معروف"}
                    </CardTitle>
                    <CardDescription>
                      {driver.vehicle_type} - {driver.vehicle_number}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(driver.id, "driver")}
                    >
                      <X className="h-4 w-4 ml-1" /> رفض
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(driver.id, "driver")}
                    >
                      <Check className="h-4 w-4 ml-1" /> موافقة
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <div>
                      رقم الهاتف: {driver.profiles?.phone_number || "غير متوفر"}
                    </div>
                    <div>
                      تاريخ الطلب:{" "}
                      {new Date(driver.created_at).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="stores" className="space-y-4 mt-4">
          {stores.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              لا يوجد طلبات متاجر جديدة
            </div>
          ) : (
            stores.map((store) => (
              <Card key={store.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                    <CardDescription>{store.type}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleReject(store.id, "store")}
                    >
                      <X className="h-4 w-4 ml-1" /> رفض
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(store.id, "store")}
                    >
                      <Check className="h-4 w-4 ml-1" /> موافقة
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <div>الهاتف: {store.phone}</div>
                    <div>
                      تاريخ الطلب:{" "}
                      {new Date(store.created_at).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
