import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SharedSidebar } from "@/components/SharedSidebar";
import { DemoBanner } from "@/components/DemoBanner";
import { PlanBanner } from "@/components/PlanBanner";
import logoImg from "@/assets/laundrylord-logo.webp";

type SharedAppShellProps = {
  routePrefix?: string;
  showDemoBanner?: boolean;
  showPlanBanner?: boolean;
};

export function SharedAppShell({
  routePrefix = "",
  showDemoBanner = false,
  showPlanBanner = false,
}: SharedAppShellProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-transparent">
        <SharedSidebar routePrefix={routePrefix} />
        <div className="flex min-w-0 flex-1 flex-col">
          {showDemoBanner && <DemoBanner />}

          <div className="flex min-w-0 flex-1 flex-col p-3 md:p-5">
            <header className="flex items-center rounded-[1.25rem] border border-border/70 bg-card/85 px-4 py-3 shadow-[0_18px_40px_-32px_rgba(30,34,30,0.45)] backdrop-blur-sm md:hidden">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-border/70 bg-background/70" />
              <div className="ml-3 flex min-w-0 items-center gap-2.5">
                <img src={logoImg} alt="LaundryLord" className="h-8 w-8 rounded-xl border border-border/60 bg-white/80 object-contain p-1" />
                <span className="truncate text-base font-semibold tracking-tight">LaundryLord</span>
              </div>
            </header>

            <main className="flex-1 overflow-auto">
              <div className="mx-auto max-w-[1200px] px-2 py-4 md:px-3 md:py-6">
                {showPlanBanner && <PlanBanner />}
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
