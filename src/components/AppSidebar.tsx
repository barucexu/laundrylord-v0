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
  { title: "Dashboard", url: "/app", icon: LayoutDashboard },
  { title: "Renters", url: "/app/renters", icon: Users },
  { title: "Machines", url: "/app/machines", icon: Box },
  { title: "Machine Map", url: "/app/machine-map", icon: MapPin },
  { title: "Payments", url: "/app/payments", icon: CreditCard },
  { title: "Maintenance", url: "/app/maintenance", icon: Wrench },
  { title: "Import", url: "/app/import", icon: Upload },
  { title: "Settings", url: "/app/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut, user } = useAuth();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-4 py-5">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="LaundryLord" className="h-8 w-8 rounded-lg object-contain" />
            <span className="font-semibold text-foreground text-base tracking-tight">LaundryLord</span>
            <SidebarTrigger className="ml-auto h-7 w-7 text-muted-foreground hover:text-foreground" />
          </div>
        ) : (
          <SidebarTrigger className="h-7 w-7 mx-auto text-muted-foreground hover:text-foreground" />
        )}
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/app"}
                      className="hover:bg-sidebar-accent rounded-md transition-colors text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="text-[11px] text-muted-foreground truncate px-1 font-mono">{user?.email}</div>
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent" onClick={signOut}>
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Button>
            <div className="text-[10px] text-muted-foreground/60 px-1">
              <Mail className="inline h-2.5 w-2.5 mr-0.5" />
              <a href="mailto:don.brucexu@gmail.com" className="hover:text-muted-foreground">don.brucexu@gmail.com</a>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="icon" className="mx-auto text-muted-foreground hover:text-foreground hover:bg-sidebar-accent" onClick={signOut}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
