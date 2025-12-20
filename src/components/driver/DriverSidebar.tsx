import { useLocation, Link } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  History,
  Wallet,
  Settings,
  LogOut,
  Navigation,
  Star,
} from "lucide-react";

const menuItems = [
  { title: "الرئيسية (بحث طلبات)", url: "/driver", icon: Navigation },
  { title: "طلباتي الحالية", url: "/driver/current", icon: MapPin },
  { title: "سجل الرحلات", url: "/driver/history", icon: History },
  { title: "محفظتي", url: "/driver/earnings", icon: Wallet },
  { title: "التقييمات", url: "/driver/ratings", icon: Star },
  { title: "الإعدادات", url: "/driver/settings", icon: Settings },
];

export function DriverSidebar() {
  const location = useLocation();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === "/driver") {
      return location.pathname === "/driver";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar className="border-l border-sidebar-border" dir="rtl" side="right">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <Navigation className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">لوحة الكابتن</h1>
            <p className="text-xs text-muted-foreground">وصل واستفيد</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>القائمة الرئيسية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
