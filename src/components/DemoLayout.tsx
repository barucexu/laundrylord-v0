import { SidebarProvider } from "@/components/ui/sidebar";
import { DemoSidebar } from "@/components/DemoSidebar";
import { DemoBanner } from "@/components/DemoBanner";
import { Outlet } from "react-router-dom";
import { SeoHead } from "@/components/SeoHead";

export function DemoLayout() {
  return (
    <SidebarProvider>
      <SeoHead
        title="Demo"
        description="LaundryLord product demo."
        canonicalPath="/demo"
        robots="noindex,nofollow"
      />
      <div className="min-h-screen flex w-full">
        <DemoSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DemoBanner />
          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-[1200px] mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
