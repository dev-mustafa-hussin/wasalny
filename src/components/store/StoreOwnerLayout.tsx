import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StoreOwnerSidebar } from "./StoreOwnerSidebar";
import { ModeToggle } from "@/components/mode-toggle";

interface StoreOwnerLayoutProps {
  children: React.ReactNode;
}

export function StoreOwnerLayout({ children }: StoreOwnerLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen flex w-full" dir="rtl">
        <StoreOwnerSidebar />
        <main className="flex-1 overflow-auto">
          <header className="flex items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground/60 hidden md:inline-block">
                مرحباً بك في لوحة التاجر
              </span>
              <ModeToggle />
            </div>
          </header>
          <div className="p-6 animate-fade-in">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
