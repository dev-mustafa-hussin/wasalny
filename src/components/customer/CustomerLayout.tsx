import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CustomerSidebar } from "./CustomerSidebar";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerFooter } from "./CustomerFooter";

export function CustomerLayout() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full" dir="rtl">
        <CustomerSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <CustomerHeader />
          <main className="flex-1 pb-16 md:pb-0">
            <Outlet />
          </main>
          <div className="hidden md:block">
            <CustomerFooter />
          </div>
          {/* Mobile Nav could be here */}
        </main>
      </div>
    </SidebarProvider>
  );
}
