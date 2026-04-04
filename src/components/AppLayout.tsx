import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { PlanBanner } from "@/components/PlanBanner";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-transparent">
        <AppSidebar />
        <div className="flex min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col px-3 py-3 md:px-4 md:py-4">
            <header className="flex items-center rounded-[1.25rem] border border-border/70 bg-card/85 px-4 py-3 shadow-[0_18px_40px_-32px_rgba(30,34,30,0.45)] backdrop-blur-sm md:hidden">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-border/70 bg-background/70" />
              <div className="ml-3">
                <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">LaundryLord</span>
                <span className="block text-sm font-bold tracking-[-0.03em]">Operator console</span>
              </div>
            </header>

            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-[1320px] px-2 py-4 md:px-4 md:py-6">
                <PlanBanner />
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
