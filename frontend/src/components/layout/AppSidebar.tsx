import { useEffect, useState } from 'react';
import { useLocation, NavLink, matchPath } from 'react-router-dom';
import { BarChart3, Users, Fuel, DollarSign, UserCheck, Settings, LogOut, Home, CreditCard, FileText, ClipboardList, Archive, Wrench, Sparkles, Banknote, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const PROFILE_URL_KEY = 'profileImageUrl';

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  roles: UserRole[];
  badge?: string;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  { title: 'Dashboard', icon: Home, href: '/dashboard', roles: ['owner', 'manager', 'employee'] },
  {
    title: 'Staff Management',
    icon: Users,
    roles: ['owner', 'manager', 'employee'],
    children: [
      { title: 'Employees', icon: Users, href: '/employees', roles: ['owner', 'manager'] },
      //{ title: 'Set Duty', icon: ClipboardList, href: '/employee-set-duty', roles: ['owner', 'manager'] },
      { title: 'Attendance', icon: UserCheck, href: '/attendance', roles: ['employee'] },
      { title: 'My Duties', icon: BarChart3, href: '/daily-duties', roles: ['employee'] },
      { title: 'Duty History', icon: ClipboardList, href: '/employee-task-history', roles: ['employee'] },
      { title: 'Special Duties', icon: Sparkles, href: '/special-duties', roles: ['employee'] },
      //{ title: 'All Tasks', icon: ClipboardList, href: '/all-employee-tasks', roles: ['owner', 'manager'] },
    ],
  },
  {
    title: 'Inventory & Products',
    icon: Fuel,
    roles: ['owner', 'manager'],
    children: [
      { title: 'Tank Inventory', icon: Fuel, href: '/inventory', roles: ['owner', 'manager'] },
      { title: 'Inventory History', icon: Archive, href: '/inventory/history', roles: ['owner', 'manager'] },
      { title: 'Products', icon: Archive, href: '/products', roles: ['owner', 'manager'] },
      { title: 'Stock Register', icon: Fuel, href: '/stock-register', roles: ['owner', 'manager'] },
    ],
  },
  {
    title: 'Sales & Finance',
    icon: DollarSign,
    roles: ['owner', 'manager', 'employee'],
    children: [
      { title: 'Sales & Collections', icon: DollarSign, href: '/sales', roles: ['owner', 'manager', 'employee'] },
      { title: 'Sales History', icon: FileText, href: '/sales-history', roles: ['owner', 'manager'] },
      { title: 'Borrowers', icon: CreditCard, href: '/borrowers', roles: ['owner', 'manager'] },
      { title: 'Expenses', icon: DollarSign, href: '/expenses', roles: ['owner', 'manager'] },
      { title: 'Bank Deposits', icon: Banknote, href: '/bank-deposits', roles: ['owner', 'manager'] },
    ],
  },
  {
    title: 'Analytics & Reports',
    icon: BarChart3,
    roles: ['owner', 'manager'],
    children: [
      { title: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['owner', 'manager'], badge: 'New' },
      { title: 'Reports', icon: FileText, href: '/reports', roles: ['owner', 'manager'] },
      { title: 'Documents', icon: FileText, href: '/documents', roles: ['owner', 'manager'] },
    ],
  },
  { title: 'Daily Summary', icon: Banknote, href: '/daily-summary', roles: ['owner', 'manager'], badge: 'New' },
  { title: 'Gun Info', icon: Wrench, href: '/guninfo', roles: ['owner', 'manager'] },
  { title: 'Settings', icon: Settings, href: '/settings', roles: ['owner', 'manager'] },
  { title: 'My Profile', icon: Users, href: '/profile', roles: ['employee', 'manager', 'owner'] },
];


export function AppSidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Dashboard']);

  const filteredItems = navigationItems.filter((item) => 
    user && item.roles.includes(user.role)
  );

  const isItemActive = (href?: string) => 
    href ? !!matchPath({ path: href, end: true }, location.pathname) : false;

  const isGroupActive = (item: NavItem) => {
    if (!item.children) return isItemActive(item.href);
    return item.children.some(child => isItemActive(child.href));
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title)
        ? prev.filter(g => g !== title)
        : [...prev, title]
    );
  };

  const handleNavClick = () => {
    if (isMobile) setOpenMobile?.(false);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem(PROFILE_URL_KEY);
    if (isMobile) setOpenMobile?.(false);
  };

  return (
    <Sidebar className="border-r bg-gradient-to-b from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <SidebarHeader className="border-b px-6 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="text-xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              FinFlux
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">Fuel Management</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item.href);
                const groupActive = isGroupActive(item);
                const isExpanded = expandedGroups.includes(item.title);

                if (item.children) {
                  // Render collapsible group
                  const visibleChildren = item.children.filter(child => 
                    user && child.roles.includes(user.role)
                  );

                  return (
                    <Collapsible
                      key={item.title}
                      open={isExpanded}
                      onOpenChange={() => toggleGroup(item.title)}
                      className="space-y-1"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            className={`rounded-lg transition-all border-l-4 ${groupActive && !isItemActive(item.href)
                              ? 'border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20 text-blue-600 dark:text-blue-300 font-medium'
                              : groupActive && isItemActive(item.href)
                              ? 'bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-950/40 dark:to-transparent border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-200 font-semibold shadow-sm'
                              : 'border-transparent text-muted-foreground hover:bg-blue-50/50 dark:hover:bg-slate-800/30 hover:text-foreground font-medium'
                              }`}
                          >
                            <div className="flex items-center w-full justify-between">
                              <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="group-data-[collapsible=icon]:hidden text-sm">
                                  {item.title}
                                </span>
                              </div>
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 transition-transform group-data-[collapsible=icon]:hidden ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                      </SidebarMenuItem>
                      <CollapsibleContent className="space-y-1 pl-6">
                        {visibleChildren.map((child) => {
                          const ChildIcon = child.icon;
                          const childActive = isItemActive(child.href);
                          return (
                            <SidebarMenuItem key={child.href}>
                              <SidebarMenuButton
                                asChild
                                isActive={childActive}
                                className={`rounded-lg transition-all border-l-4 ${childActive
                                  ? 'bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-950/40 dark:to-transparent border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-200 font-semibold shadow-sm'
                                  : 'border-transparent text-muted-foreground hover:bg-blue-50/50 dark:hover:bg-slate-800/40 hover:text-foreground font-medium'
                                  }`}
                              >
                                <NavLink
                                  to={child.href!}
                                  className="flex items-center gap-3 px-3 py-2.5"
                                  onClick={handleNavClick}
                                >
                                  <ChildIcon className="h-4 w-4 shrink-0" />
                                  <span className="group-data-[collapsible=icon]:hidden text-sm flex-1">
                                    {child.title}
                                  </span>
                                  {child.badge && (
                                    <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0 font-bold group-data-[collapsible=icon]:hidden hover:bg-emerald-500 shadow-sm">
                                      {child.badge}
                                    </Badge>
                                  )}
                                </NavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                } else {
                  // Render simple menu item
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        className={`rounded-lg transition-all border-l-4 ${active
                          ? 'bg-gradient-to-r from-blue-50/80 to-transparent dark:from-blue-950/40 dark:to-transparent border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-200 font-semibold shadow-sm'
                          : 'border-transparent text-muted-foreground hover:bg-blue-50/50 dark:hover:bg-slate-800/30 hover:text-foreground font-medium'
                          }`}
                      >
                        <NavLink
                          to={item.href!}
                          className="flex items-center gap-3 px-3 py-2.5"
                          onClick={handleNavClick}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="group-data-[collapsible=icon]:hidden text-sm flex-1">
                            {item.title}
                          </span>
                          {item.badge && (
                            <Badge className="bg-emerald-500 text-white text-[9px] px-1.5 py-0 font-bold group-data-[collapsible=icon]:hidden hover:bg-emerald-500 shadow-sm">
                              {item.badge}
                            </Badge>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-3 shadow-sm">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span className="group-data-[collapsible=icon]:hidden">Logout</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
