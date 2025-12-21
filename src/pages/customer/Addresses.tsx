import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Plus, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Addresses() {
  const { user } = useAuth();

  const { data: addresses, isLoading } = useQuery({
    queryKey: ["addresses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("delivery_address")
        .eq("customer_id", user.id)
        .not("delivery_address", "is", null);

      if (error) throw error;

      // Filter unique addresses and remove empty strings
      const unique = Array.from(
        new Set(data.map((o) => o.delivery_address).filter(Boolean))
      );
      return unique;
    },
    enabled: !!user,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("تم نسخ العنوان");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              <ArrowRight className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">عناويني</h1>
          </div>
          <Button
            onClick={() => toast.info("هذه الميزة ستتوفر قريباً")}
            size="sm"
          >
            <Plus className="h-4 w-4 ml-2" />
            إضافة عنوان
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !addresses || addresses.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">لا توجد عناوين محفوظة</h3>
            <p className="text-muted-foreground">
              ستظهر هنا العناوين التي استخدمتها في طلباتك السابقة
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {addresses.map((address, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{address}</p>
                      <p className="text-xs text-muted-foreground">
                        من سجل الطلبات
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(address as string)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
