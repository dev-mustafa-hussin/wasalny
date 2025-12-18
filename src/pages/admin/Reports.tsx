import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart,
  Calendar,
  Filter,
  X,
  FileDown,
  Mail
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, differenceInDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EmailStats from '@/components/admin/EmailStats';

interface OrderData {
  id: string;
  total_amount: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  store_id: string;
}

interface StoreData {
  id: string;
  name: string;
}

interface DailyStats {
  date: string;
  orders: number;
  revenue: number;
}

interface StoreStats {
  name: string;
  orders: number;
  revenue: number;
}

export default function Reports() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);

  const isCustomDateRange = startDate && endDate;

  useEffect(() => {
    fetchData();
  }, [period, selectedStore, selectedStatus, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    
    let fromDate: Date;
    let toDate: Date = new Date();
    toDate.setHours(23, 59, 59, 999);

    if (isCustomDateRange) {
      fromDate = new Date(startDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(endDate);
      toDate.setHours(23, 59, 59, 999);
    } else {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - parseInt(period));
      fromDate.setHours(0, 0, 0, 0);
    }

    const daysDiff = isCustomDateRange 
      ? differenceInDays(endDate, startDate) + 1 
      : parseInt(period);

    let ordersQuery = supabase
      .from('orders')
      .select('id, total_amount, delivery_fee, status, created_at, store_id')
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString());

    if (selectedStore !== 'all') {
      ordersQuery = ordersQuery.eq('store_id', selectedStore);
    }

    if (selectedStatus !== 'all') {
      ordersQuery = ordersQuery.eq('status', selectedStatus);
    }

    const [ordersRes, storesRes] = await Promise.all([
      ordersQuery,
      supabase.from('stores').select('id, name'),
    ]);

    const ordersData = ordersRes.data || [];
    const storesData = storesRes.data || [];

    setOrders(ordersData);
    setStores(storesData);

    // Calculate daily stats
    const dailyMap: Record<string, { orders: number; revenue: number }> = {};
    
    // Initialize all days in range
    for (let i = daysDiff - 1; i >= 0; i--) {
      const date = new Date(toDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
      dailyMap[dateStr] = { orders: 0, revenue: 0 };
    }

    ordersData.forEach(order => {
      const date = new Date(order.created_at);
      const dateStr = date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].orders += 1;
        dailyMap[dateStr].revenue += Number(order.total_amount) || 0;
      }
    });

    setDailyStats(Object.entries(dailyMap).map(([date, stats]) => ({
      date,
      ...stats,
    })));

    // Calculate store stats
    const storeMap: Record<string, { orders: number; revenue: number }> = {};
    ordersData.forEach(order => {
      if (!storeMap[order.store_id]) {
        storeMap[order.store_id] = { orders: 0, revenue: 0 };
      }
      storeMap[order.store_id].orders += 1;
      storeMap[order.store_id].revenue += Number(order.total_amount) || 0;
    });

    const storeStatsData = Object.entries(storeMap)
      .map(([storeId, stats]) => ({
        name: storesData.find(s => s.id === storeId)?.name || 'غير معروف',
        ...stats,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    setStoreStats(storeStatsData);
    setLoading(false);
  };

  // Calculate summary stats
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const totalDeliveryFees = orders.reduce((sum, o) => sum + (Number(o.delivery_fee) || 0), 0);
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

  // Status breakdown for pie chart
  const statusBreakdown = [
    { status: 'delivered', label: 'مكتمل', count: orders.filter(o => o.status === 'delivered').length, color: 'hsl(var(--success))' },
    { status: 'cancelled', label: 'ملغي', count: orders.filter(o => o.status === 'cancelled').length, color: 'hsl(var(--destructive))' },
    { status: 'pending', label: 'معلق', count: orders.filter(o => o.status === 'pending').length, color: 'hsl(var(--warning))' },
    { status: 'other', label: 'أخرى', count: orders.filter(o => !['delivered', 'cancelled', 'pending'].includes(o.status)).length, color: 'hsl(var(--muted))' },
  ].filter(s => s.count > 0);

  const statusOptions = [
    { value: 'pending', label: 'معلق' },
    { value: 'confirmed', label: 'مؤكد' },
    { value: 'preparing', label: 'قيد التحضير' },
    { value: 'out_for_delivery', label: 'في الطريق' },
    { value: 'delivered', label: 'تم التوصيل' },
    { value: 'cancelled', label: 'ملغي' },
  ];

  const clearFilters = () => {
    setSelectedStore('all');
    setSelectedStatus('all');
    setStartDate(undefined);
    setEndDate(undefined);
    setPeriod('30');
  };

  const hasActiveFilters = selectedStore !== 'all' || selectedStatus !== 'all' || isCustomDateRange;

  const exportToCSV = () => {
    const headers = ['التاريخ', 'رقم الطلب', 'المبلغ', 'رسوم التوصيل', 'الحالة'];
    const rows = orders.map(o => [
      new Date(o.created_at).toLocaleDateString('ar-SA'),
      o.id.slice(0, 8),
      o.total_amount,
      o.delivery_fee,
      o.status,
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'معلق',
      confirmed: 'مؤكد',
      preparing: 'قيد التحضير',
      out_for_delivery: 'في الطريق',
      delivered: 'تم التوصيل',
      cancelled: 'ملغي',
    };
    return labels[status] || status;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(18);
    doc.text('Orders Report - Waslni', 105, 15, { align: 'center' });
    
    // Add date range
    doc.setFontSize(10);
    const dateRange = isCustomDateRange 
      ? `${format(startDate!, 'dd/MM/yyyy')} - ${format(endDate!, 'dd/MM/yyyy')}`
      : `Last ${period} days`;
    doc.text(`Period: ${dateRange}`, 105, 25, { align: 'center' });
    
    // Add summary
    doc.setFontSize(12);
    doc.text('Summary:', 14, 40);
    doc.setFontSize(10);
    doc.text(`Total Revenue: ${totalRevenue.toFixed(2)} SAR`, 14, 50);
    doc.text(`Total Orders: ${totalOrders}`, 14, 57);
    doc.text(`Completed Orders: ${completedOrders}`, 14, 64);
    doc.text(`Cancelled Orders: ${cancelledOrders}`, 14, 71);
    doc.text(`Average Order Value: ${averageOrderValue.toFixed(2)} SAR`, 14, 78);
    doc.text(`Completion Rate: ${completionRate.toFixed(1)}%`, 14, 85);
    
    // Add orders table
    const tableData = orders.map(o => [
      new Date(o.created_at).toLocaleDateString('en-US'),
      o.id.slice(0, 8),
      `${o.total_amount} SAR`,
      `${o.delivery_fee} SAR`,
      getStatusLabel(o.status),
    ]);

    (doc as any).autoTable({
      head: [['Date', 'Order ID', 'Amount', 'Delivery Fee', 'Status']],
      body: tableData,
      startY: 95,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`orders-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          التقارير
        </h1>
        <p className="text-muted-foreground">تقارير تفصيلية للطلبات والإيرادات والإيميلات</p>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            تقارير الطلبات
          </TabsTrigger>
          <TabsTrigger value="emails" className="gap-2">
            <Mail className="h-4 w-4" />
            إحصائيات البريد
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Select 
            value={isCustomDateRange ? 'custom' : period} 
            onValueChange={(val) => {
              if (val !== 'custom') {
                setStartDate(undefined);
                setEndDate(undefined);
                setPeriod(val);
              }
            }}
          >
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 ml-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر 7 أيام</SelectItem>
              <SelectItem value="30">آخر 30 يوم</SelectItem>
              <SelectItem value="90">آخر 90 يوم</SelectItem>
              {isCustomDateRange && <SelectItem value="custom">نطاق مخصص</SelectItem>}
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 ml-2" />
            CSV
          </Button>
          <Button onClick={exportToPDF} variant="outline" size="sm">
            <FileDown className="h-4 w-4 ml-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">فلترة:</span>
            </div>

            {/* Custom Date Range */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-36 justify-start text-right font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-4 w-4 ml-2" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "من تاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      setStartDate(date);
                      if (date && !endDate) {
                        setEndDate(new Date());
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <span className="text-muted-foreground">-</span>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-36 justify-start text-right font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="h-4 w-4 ml-2" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "إلى تاريخ"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date > new Date() || (startDate && date < startDate)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-4">
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="جميع المتاجر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المتاجر</SelectItem>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="جميع الحالات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {statusOptions.map(status => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-4 w-4 ml-1" />
                مسح الفلاتر
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-3">
              {isCustomDateRange && (
                <Badge variant="secondary">
                  الفترة: {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
                </Badge>
              )}
              {selectedStore !== 'all' && (
                <Badge variant="secondary">
                  المتجر: {stores.find(s => s.id === selectedStore)?.name}
                </Badge>
              )}
              {selectedStatus !== 'all' && (
                <Badge variant="secondary">
                  الحالة: {statusOptions.find(s => s.value === selectedStatus)?.label}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الإيرادات
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)} ر.س</div>
            <p className="text-xs text-muted-foreground">
              رسوم التوصيل: {totalDeliveryFees.toFixed(2)} ر.س
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              إجمالي الطلبات
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              مكتمل: {completedOrders} | ملغي: {cancelledOrders}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              متوسط قيمة الطلب
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageOrderValue.toFixed(2)} ر.س</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              نسبة الإكمال
            </CardTitle>
            {completionRate >= 80 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "الإيرادات", color: "hsl(var(--primary))" },
              }}
              className="h-[250px] w-full"
            >
              <LineChart data={dailyStats}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} ر.س`} />} />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle>عدد الطلبات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                orders: { label: "الطلبات", color: "hsl(var(--info))" },
              }}
              className="h-[250px] w-full"
            >
              <BarChart data={dailyStats}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="orders" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع حالات الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ChartContainer
                config={{ count: { label: "العدد" } }}
                className="h-[200px] w-1/2"
              >
                <PieChart>
                  <Pie
                    data={statusBreakdown}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                  >
                    {statusBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
              <div className="space-y-2">
                {statusBreakdown.map((item) => (
                  <div key={item.status} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-sm">{item.label}: {item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Stores */}
        <Card>
          <CardHeader>
            <CardTitle>أفضل المتاجر</CardTitle>
          </CardHeader>
          <CardContent>
            {storeStats.length > 0 ? (
              <ChartContainer
                config={{
                  revenue: { label: "الإيرادات", color: "hsl(var(--success))" },
                }}
                className="h-[200px] w-full"
              >
                <BarChart data={storeStats} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false} 
                    axisLine={false}
                    width={80}
                  />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${value} ر.س`} />} />
                  <Bar dataKey="revenue" fill="hsl(var(--success))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">لا توجد بيانات</p>
            )}
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="emails">
          <EmailStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}