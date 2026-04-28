import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { SupportFooter } from "@/components/SupportFooter";
import { PlanBanner } from "@/components/PlanBanner";
import { SeoHead } from "@/components/SeoHead";

export function AppLayout() {
  return (
    <SidebarProvider>
      <SeoHead
        title="App"
        description="LaundryLord operator application."
        canonicalPath="/app"
        robots="noindex,nofollow"
      />
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center h-12 border-b px-4 md:hidden">
            <SidebarTrigger />
            <span className="ml-2 font-semibold text-sm">LaundryLord</span>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-[1200px] mx-auto">
              <PlanBanner />
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
