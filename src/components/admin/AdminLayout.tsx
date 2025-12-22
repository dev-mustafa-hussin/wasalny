import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useOrderNotifications } from "@/hooks/useOrderNotifications";
import { Loader2 } from "lucide-react";
import { UserMenu } from "./UserMenu";
import { NotificationsPopover } from "./NotificationsPopover";

export function AdminLayout() {
  // TEMPORARY: Mock for debugging
  const user = { email: "admin@test.com" };
  const loading = false;
  // const { user, loading, userRole } = useAuth();
  const navigate = useNavigate();

  // Subscribe to real-time order notifications
  useOrderNotifications();

  useEffect(() => {
    // if (!loading && !user) {
    //   navigate("/auth");
    // }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <AdminSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-card flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <NotificationsPopover />
              <UserMenu />
            </div>
          </header>
          <div className="flex-1 p-6 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
