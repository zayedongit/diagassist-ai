import { 
  LayoutDashboard, 
  Users, 
  Link as LinkIcon, 
  FlaskConical, 
  CreditCard, 
  Settings,
  LogOut
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: 'Overview', url: '/admin', icon: LayoutDashboard, exact: true },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Demo Links', url: '/admin/demo-links', icon: LinkIcon },
  { title: 'Lab Configs', url: '/admin/labs', icon: FlaskConical },
  { title: 'Payments', url: '/admin/payments', icon: CreditCard },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const isActive = (url: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === url;
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarContent>
        {/* Logo/Brand */}
        <div className="p-4 border-b">
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">DA</span>
              </div>
              <div>
                <h2 className="font-semibold text-sm">daigassist</h2>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mx-auto">
              <span className="text-primary-foreground font-bold text-sm">DA</span>
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.exact)}>
                    <NavLink 
                      to={item.url}
                      className="flex items-center gap-2 w-full"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 border-t">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={handleSignOut}
          className="w-full justify-start"
          title="Sign Out"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
