import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Phone, Truck, Star } from "lucide-react";

interface DriverInfoCardProps {
  driverName?: string;
  driverPhone?: string | null;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  rating?: number;
}

export function DriverInfoCard({
  driverName,
  driverPhone,
  vehicleType,
  vehicleNumber,
  rating,
}: DriverInfoCardProps) {
  if (!driverName) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <span>معلومات المندوب</span>
          </div>
          {rating && (
            <div className="flex items-center gap-1 text-sm bg-background px-2 py-1 rounded-full border">
              <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
              <span>{rating.toFixed(1)}</span>
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg">{driverName}</p>
            {vehicleType && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                <Truck className="h-4 w-4" />
                <span>
                  {vehicleType} - {vehicleNumber}
                </span>
              </div>
            )}
          </div>

          {driverPhone && (
            <Button size="sm" asChild>
              <a
                href={`tel:${driverPhone}`}
                className="flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                <span>اتصال</span>
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
