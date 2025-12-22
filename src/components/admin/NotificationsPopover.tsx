import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

// Placeholder for notifications interface
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export function NotificationsPopover() {
  // Mock data for now - in a real app this would come from a context or hook
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "طلب جديد",
      message: "وصل طلب جديد من مطعم البيك بقيمة 50 ريال",
      time: "منذ دقيقتين",
      read: false,
    },
    {
      id: "2",
      title: "تسجيل مندوب",
      message: "قام مندوب جديد بالتسجيل وينتظر الموافقة",
      time: "منذ 15 دقيقة",
      read: false,
    },
    {
      id: "3",
      title: "تم تسليم الطلب",
      message: "تم تسليم الطلب #1234 بنجاح",
      time: "منذ ساعة",
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
            <CardTitle className="text-sm font-semibold">الإشعارات</CardTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                className="text-xs h-auto p-0 text-muted-foreground hover:text-primary"
                onClick={markAllAsRead}
              >
                تحديد الكل كمقروء
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-4 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">لا توجد إشعارات جديدة</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`flex flex-col gap-1 p-4 hover:bg-muted/50 transition-colors ${
                        !notification.read ? "bg-muted/10" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-sm font-medium ${
                            !notification.read
                              ? "text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {notification.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {notification.time}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
