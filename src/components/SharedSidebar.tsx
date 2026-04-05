import { LayoutDashboard, Users, Box, CreditCard, Wrench, Settings, LogOut, Upload, Mail, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logoImg from "@/assets/laundrylord-logo.webp";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type SharedSidebarProps = {
  routePrefix?: string;
};

const navItems = [
  { title: "Dashboard", url: "", icon: LayoutDashboard, end: true },
  { title: "Renters", url: "/renters", icon: Users },
  { title: "Machines", url: "/machines", icon: Box },
  { title: "Machine Map", url: "/machine-map", icon: MapPin },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function SharedSidebar({ routePrefix = "" }: SharedSidebarProps) {
  const { state } = useSidebar();
  const { signOut, user, isDemo } = useAuth();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  const footerEmail = isDemo ? "demo@laundrylord.com" : user?.email;

  const handleFooterAction = async () => {
    if (isDemo) {
      navigate("/auth");
      return;
    }

    await signOut();
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border/70 bg-sidebar/92 backdrop-blur-xl [--sidebar-width:17rem] [--sidebar-width-icon:4.5rem]"
    >
      <SidebarHeader className={collapsed ? "px-2 py-4" : "px-5 py-5"}>
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="LaundryLord" className="h-10 w-10 rounded-xl border border-sidebar-border/60 bg-white/75 object-contain p-1.5 shadow-sm" />
            <span className="min-w-0 flex-1 truncate text-[1.05rem] font-semibold tracking-tight text-foreground">LaundryLord</span>
            <SidebarTrigger className="h-8 w-8 shrink-0 rounded-xl border border-sidebar-border/70 bg-background/70 text-muted-foreground hover:text-foreground" />
          </div>
        ) : (
          <div className="flex justify-center">
            <SidebarTrigger className="h-10 w-10 rounded-2xl border border-sidebar-border/70 bg-background/70 text-muted-foreground hover:text-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className={collapsed ? "px-2" : "px-4"}>
        <SidebarGroup className={collapsed ? "px-0.5 py-2" : "px-0 py-2"}>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={collapsed ? item.title : undefined}>
                    <NavLink
                      to={`${routePrefix}${item.url || ""}` || "/"}
                      end={item.end}
                      className={
                        collapsed
                          ? "rounded-2xl border border-transparent p-0 text-sidebar-foreground transition-all hover:border-sidebar-border/70 hover:bg-sidebar-accent/85"
                          : "rounded-[1.15rem] border border-transparent px-3 py-2.5 text-sidebar-foreground transition-all hover:border-sidebar-border/70 hover:bg-sidebar-accent/85"
                      }
                      activeClassName={
                        collapsed
                          ? "border-sidebar-border/70 bg-sidebar-accent text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] [&_.sidebar-nav-icon]:border-primary/20 [&_.sidebar-nav-icon]:bg-primary/10 [&_.sidebar-nav-icon]:text-primary"
                          : "border-sidebar-border/70 bg-sidebar-accent text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)] [&_.sidebar-nav-icon]:border-primary/20 [&_.sidebar-nav-icon]:bg-primary/10 [&_.sidebar-nav-icon]:text-primary"
                      }
                    >
                      <span
                        className={
                          collapsed
                            ? "sidebar-nav-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-transparent bg-background/10 text-muted-foreground transition-all"
                            : "sidebar-nav-icon inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent bg-background/10 text-muted-foreground transition-all"
                        }
                      >
                        <item.icon className="h-4 w-4" />
                      </span>
                      {!collapsed && <span className="text-sm tracking-[-0.01em]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={collapsed ? "border-t border-sidebar-border/70 p-2" : "border-t border-sidebar-border/70 p-4"}>
        {!collapsed ? (
          <div className="space-y-2">
            <div className="truncate px-1 font-mono text-[11px] text-muted-foreground">{footerEmail}</div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-full justify-start gap-2 rounded-xl px-3 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              onClick={handleFooterAction}
            >
              <LogOut className="h-3.5 w-3.5" />
              {isDemo ? "Exit Demo" : "Sign Out"}
            </Button>
            {!isDemo && (
              <div className="px-1 text-[10px] text-muted-foreground/70">
                <Mail className="mr-1 inline h-2.5 w-2.5" />
                <a href="mailto:don.brucexu@gmail.com" className="hover:text-muted-foreground">
                  don.brucexu@gmail.com
                </a>
              </div>
            )}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mx-auto h-10 w-10 rounded-2xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            onClick={handleFooterAction}
          >
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
