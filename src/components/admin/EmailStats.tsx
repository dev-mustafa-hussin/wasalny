import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Mail, MailOpen, TrendingUp, Send } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EmailLog {
  id: string;
  recipient_email: string;
  status: string;
  subject: string | null;
  sent_at: string;
  opened_at: string | null;
  is_test: boolean;
}

interface DailyEmailStats {
  date: string;
  sent: number;
  opened: number;
}

const statusLabels: Record<string, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'تم التأكيد',
  preparing: 'جاري التحضير',
  ready: 'جاهز',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export default function EmailStats() {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchEmailStats();
  }, [period]);

  const fetchEmailStats = async () => {
    setLoading(true);
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(period));

    const { data, error } = await supabase
      .from('email_logs')
      .select('*')
      .gte('sent_at', fromDate.toISOString())
      .order('sent_at', { ascending: false });

    if (error) {
      console.error('Error fetching email logs:', error);
    } else {
      setEmailLogs(data || []);
    }
    setLoading(false);
  };

  // Calculate stats
  const totalEmails = emailLogs.filter(e => !e.is_test).length;
  const testEmails = emailLogs.filter(e => e.is_test).length;
  const openedEmails = emailLogs.filter(e => !e.is_test && e.opened_at).length;
  const openRate = totalEmails > 0 ? (openedEmails / totalEmails) * 100 : 0;

  // Daily stats
  const dailyMap: Record<string, { sent: number; opened: number }> = {};
  const today = new Date();
  for (let i = parseInt(period) - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    dailyMap[dateStr] = { sent: 0, opened: 0 };
  }

  emailLogs.filter(e => !e.is_test).forEach(email => {
    const date = new Date(email.sent_at);
    const dateStr = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
    if (dailyMap[dateStr]) {
      dailyMap[dateStr].sent += 1;
      if (email.opened_at) {
        dailyMap[dateStr].opened += 1;
      }
    }
  });

  const dailyStats: DailyEmailStats[] = Object.entries(dailyMap).map(([date, stats]) => ({
    date,
    ...stats,
  }));

  // Status breakdown
  const statusMap: Record<string, number> = {};
  emailLogs.filter(e => !e.is_test).forEach(email => {
    statusMap[email.status] = (statusMap[email.status] || 0) + 1;
  });

  const COLORS = [
    'hsl(var(--primary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--destructive))',
    'hsl(var(--muted))',
    '#8b5cf6',
    '#ec4899',
  ];

  const statusBreakdown = Object.entries(statusMap).map(([status, count], index) => ({
    status,
    label: statusLabels[status] || status,
    count,
    color: COLORS[index % COLORS.length],
  }));

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Mail className="h-5 w-5" />
          إحصائيات البريد الإلكتروني
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">آخر 7 أيام</SelectItem>
            <SelectItem value="30">آخر 30 يوم</SelectItem>
            <SelectItem value="90">آخر 90 يوم</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإيميلات
            </CardTitle>
            <Send className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmails}</div>
            <p className="text-xs text-muted-foreground">
              تجريبي: {testEmails}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              الإيميلات المفتوحة
            </CardTitle>
            <MailOpen className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openedEmails}</div>
            <p className="text-xs text-muted-foreground">
              من أصل {totalEmails}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              معدل الفتح
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {openRate >= 20 ? 'جيد جداً' : openRate >= 10 ? 'متوسط' : 'يحتاج تحسين'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              متوسط يومي
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(totalEmails / parseInt(period)).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">إيميل/يوم</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الإيميلات حسب اليوم</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <LineChart data={dailyStats}>
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="sent"
                  name="مرسل"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="opened"
                  name="مفتوح"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">الإيميلات حسب الحالة</CardTitle>
          </CardHeader>
          <CardContent>
            {statusBreakdown.length > 0 ? (
              <ChartContainer config={{}} className="h-[300px]">
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="label"
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                لا توجد بيانات
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {statusBreakdown.map((item) => (
                <div key={item.status} className="flex items-center gap-1 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}: {item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">آخر الإيميلات المرسلة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">المستلم</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">تاريخ الإرسال</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">تاريخ الفتح</th>
                  <th className="text-right py-3 px-2 font-medium text-muted-foreground">نوع</th>
                </tr>
              </thead>
              <tbody>
                {emailLogs.slice(0, 10).map((email) => (
                  <tr key={email.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">{email.recipient_email}</td>
                    <td className="py-3 px-2">
                      <span className="inline-block px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                        {statusLabels[email.status] || email.status}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      {new Date(email.sent_at).toLocaleDateString('ar-SA', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-2">
                      {email.opened_at ? (
                        <span className="text-success flex items-center gap-1">
                          <MailOpen className="h-3 w-3" />
                          {new Date(email.opened_at).toLocaleDateString('ar-SA', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2">
                      {email.is_test ? (
                        <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded">
                          تجريبي
                        </span>
                      ) : (
                        <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded">
                          حقيقي
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {emailLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      لا توجد إيميلات مرسلة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
