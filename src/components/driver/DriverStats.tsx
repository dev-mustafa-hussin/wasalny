import { Card, CardContent } from "@/components/ui/card";
import { DollarSign, CheckCircle } from "lucide-react";

interface DriverStatsProps {
  todayEarnings: number;
  completedToday: number;
  totalEarnings: number;
}

export function DriverStats({
  todayEarnings,
  completedToday,
  totalEarnings,
}: DriverStatsProps) {
  return (
    <div className="space-y-4">
      {/* Daily Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-foreground">
              {todayEarnings.toFixed(2)} ر.س
            </p>
            <p className="text-xs text-muted-foreground">أرباح اليوم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">
              {completedToday}
            </p>
            <p className="text-xs text-muted-foreground">توصيلات اليوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Earnings */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الأرباح</p>
              <p className="text-3xl font-bold text-foreground">
                {totalEarnings.toFixed(2)} ر.س
              </p>
            </div>
            <DollarSign className="w-12 h-12 text-green-500/50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
