import { LayoutDashboard, Users, Box, CreditCard, Wrench, Settings, LogOut, Upload, Mail, MapPin } from "lucide-react";
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

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Renters", url: "/renters", icon: Users },
  { title: "Machines", url: "/machines", icon: Box },
  { title: "Machine Map", url: "/machine-map", icon: MapPin },
  { title: "Payments", url: "/payments", icon: CreditCard },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
  { title: "Import", url: "/import", icon: Upload },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border/70 bg-sidebar/90 backdrop-blur-xl">
      <SidebarHeader className="px-4 py-5">
        {!collapsed ? (
          <div className="rounded-[1.4rem] border border-sidebar-border/70 bg-[linear-gradient(180deg,hsl(var(--sidebar-background)),hsl(var(--sidebar-accent)/0.7))] p-3 shadow-[0_24px_50px_-35px_rgba(27,36,30,0.45)]">
            <div className="flex items-center gap-3">
              <img src={logoImg} alt="LaundryLord" className="h-10 w-10 rounded-2xl border border-sidebar-border/60 bg-white/70 object-contain p-1.5 shadow-sm" />
              <div className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">LaundryLord</span>
                <span className="block truncate text-base font-extrabold tracking-[-0.04em] text-foreground">Operator console</span>
              </div>
              <SidebarTrigger className="ml-auto h-9 w-9 rounded-xl border border-sidebar-border/70 bg-background/70 text-muted-foreground hover:text-foreground" />
            </div>
          </div>
        ) : (
          <SidebarTrigger className="mx-auto h-9 w-9 rounded-xl border border-sidebar-border/70 bg-background/70 text-muted-foreground hover:text-foreground" />
        )}
      </SidebarHeader>
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="rounded-xl border border-transparent px-3 py-3 text-sidebar-foreground transition-all hover:border-sidebar-border/70 hover:bg-sidebar-accent/80"
                      activeClassName="border-sidebar-border/70 bg-sidebar-accent text-primary font-semibold shadow-[inset_0_1px_0_hsl(0_0%_100%/0.45)]"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="text-sm tracking-[-0.01em]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        {!collapsed ? (
          <div className="space-y-3 rounded-[1.25rem] border border-sidebar-border/70 bg-sidebar-accent/55 p-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Signed in</div>
              <div className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{user?.email}</div>
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 rounded-xl text-muted-foreground hover:bg-background/80 hover:text-foreground" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
            <div className="px-1 text-[10px] text-muted-foreground/70">
              <Mail className="inline h-2.5 w-2.5 mr-0.5" />
              <a href="mailto:don.brucexu@gmail.com" className="hover:text-muted-foreground">don.brucexu@gmail.com</a>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="mx-auto rounded-xl text-muted-foreground hover:bg-sidebar-accent hover:text-foreground" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
