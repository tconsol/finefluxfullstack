import { useMemo, useRef, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, ChevronRight, Sparkles, User, Search, LogOut, UserCircle,
  ChevronDown, BarChart3, Users, Fuel, DollarSign, UserCheck, Settings,
  CreditCard, FileText, ClipboardList, Archive, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { motion, AnimatePresence } from 'framer-motion';

const PROFILE_URL_KEY = 'profileImageUrl';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [orgId, setOrgId] = useState<string>('');
  const [empId, setEmpId] = useState<string>('');

  useEffect(() => {
    setAvatarUrl(localStorage.getItem(PROFILE_URL_KEY) || '');
    setOrgId(localStorage.getItem('organizationId') || '');
    setEmpId(localStorage.getItem('empId') || '');
    const onStorage = (e: StorageEvent) => {
      if (e.key === PROFILE_URL_KEY) {
        setAvatarUrl(e.newValue || '');
      }
      if (e.key === 'organizationId') {
        setOrgId(e.newValue || '');
      }
      if (e.key === 'empId') {
        setEmpId(e.newValue || '');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!user) return null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allNavItems = useMemo(() => [
    { title: 'Dashboard', icon: Home, href: '/dashboard', roles: ['owner', 'manager', 'employee'] },
    { title: 'Analytics', icon: BarChart3, href: '/analytics', roles: ['owner', 'manager'], badge: 'New' },
    { title: 'Employees', icon: Users, href: '/employees', roles: ['owner', 'manager'] },
    { title: 'Set Duty', icon: ClipboardList, href: '/employee-set-duty', roles: ['owner', 'manager'] },
    { title: 'Tank Inventory', icon: Fuel, href: '/inventory', roles: ['owner', 'manager'] },
    { title: 'Sales & Collections', icon: DollarSign, href: '/sales', roles: ['owner', 'manager', 'employee'] },
    { title: 'Products', icon: Archive, href: '/products', roles: ['owner', 'manager'] },
    { title: 'Borrowers', icon: CreditCard, href: '/borrowers', roles: ['owner', 'manager'] },
    { title: 'Documents', icon: FileText, href: '/documents', roles: ['owner', 'manager'] },
    { title: 'Gun Info', icon: Wrench, href: '/guninfo', roles: ['owner', 'manager'] },
    { title: 'Expenses', icon: DollarSign, href: '/expenses', roles: ['owner', 'manager'] },
    { title: 'Reports', icon: FileText, href: '/reports', roles: ['owner', 'manager'] },
    { title: 'Attendance', icon: UserCheck, href: '/attendance', roles: ['employee'] },
    { title: 'Special Duties', icon: Sparkles, href: '/special-duties', roles: ['employee'] },
    { title: 'Daily Duty', icon: BarChart3, href: '/daily-duties', roles: ['employee'] },
    { title: 'Duty History', icon: ClipboardList, href: '/employee-task-history', roles: ['employee'] },
    { title: 'My Profile', icon: Users, href: '/profile', roles: ['employee', 'manager', 'owner'] },
    { title: 'Settings', icon: Settings, href: '/settings', roles: ['owner', 'manager'] }
  ].filter(item => item.roles.includes(user.role as any)), [user.role]);

  const filteredResults = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();
    if (!searchTerm) return [];
    return allNavItems
      .filter(item => item.title.toLowerCase().includes(searchTerm))
      .slice(0, 8);
  }, [query, allNavItems]);

  useEffect(() => {
    setShowSearchResults(query.trim().length > 0 && filteredResults.length > 0);
  }, [query, filteredResults]);

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      return { title, href, isLast: index === segments.length - 1 };
    });
  };
  const breadcrumbs = getBreadcrumbs();

  const handleLogout = () => {
    setShowProfileMenu(false);
    localStorage.removeItem(PROFILE_URL_KEY);
    logout();
  };

  const handleProfileClick = () => {
    setShowProfileMenu(false);
    navigate('/profile');
  };

  const handleSearchSelect = (href: string) => {
    setQuery('');
    setShowSearchResults(false);
    navigate(href);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="sticky top-0 z-40 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 border-b border-white/20 dark:border-slate-700/50 shadow-lg shadow-black/5 shrink-0"
          >
            <div className="flex items-center gap-4 h-16 px-6">
              {/* Left Section */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <SidebarTrigger className="hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg p-2 shrink-0" />
                <Separator orientation="vertical" className="h-6 bg-gradient-to-b from-transparent via-border to-transparent" />
                <Breadcrumb className="flex-1 min-w-0">
                  <BreadcrumbList className="flex items-center gap-2 overflow-x-auto">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        href="/dashboard"
                        className="flex items-center gap-2 text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors group shrink-0"
                      >
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-all">
                          <Home className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">Home</span>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {breadcrumbs.map((crumb, idx) => (
                      <div key={idx} className="flex items-center gap-2 shrink-0">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        <BreadcrumbItem>
                          {crumb.isLast ? (
                            <BreadcrumbPage className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-800/50">
                              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              <span className="font-semibold text-foreground whitespace-nowrap">{crumb.title}</span>
                            </BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink
                              href={crumb.href}
                              className="text-muted-foreground hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium whitespace-nowrap"
                            >
                              {crumb.title}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
              {/* Right Section */}
              <div className="flex items-center gap-2">
                <div className="relative" ref={searchRef}>
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search pages..."
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => {
                      if (query.trim() && filteredResults.length > 0) {
                        setShowSearchResults(true);
                      }
                    }}
                    className="pl-9 pr-4 w-64 h-9 bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-slate-700/50 focus:bg-white dark:focus:bg-slate-800 transition-all"
                  />
                  <AnimatePresence>
                    {showSearchResults && filteredResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 w-full top-full mt-2 z-50 rounded-lg bg-white dark:bg-slate-800 border border-border shadow-2xl overflow-hidden"
                      >
                        <div className="py-2">
                          {filteredResults.map(item => (
                            <button
                              key={item.href}
                              type="button"
                              onClick={() => handleSearchSelect(item.href)}
                              className="flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group"
                            >
                              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                <item.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              <span className="text-sm font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">{item.title}</span>
                            </button>
                          ))}
                        </div>
                        {query.trim() && filteredResults.length === 0 && (
                          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No pages found for "{query}"
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                {/* Profile Dropdown */}
                <div className="relative" ref={profileMenuRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all rounded-lg px-3"
                  >
                    <Avatar className="h-8 w-8">
                      {avatarUrl ? (
                        <AvatarImage
                          src={avatarUrl}
                          alt={user.name || user.username || 'User'}
                          onError={() => setAvatarUrl('')}
                        />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                        {(user.name || user.username || 'U').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden xl:flex flex-col items-start">
                      <span className="text-xs font-semibold text-foreground">{user.name || 'User'}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user.role || 'Admin'}</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                  </Button>
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-72 rounded-lg bg-white dark:bg-slate-800 border border-border shadow-2xl overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                          <p className="font-semibold text-sm text-foreground">{user.name || 'User'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{user.email || 'user@example.com'}</p>
                          <Badge variant="secondary" className="mt-2 text-xs capitalize">
                            {user.role || 'Admin'}
                          </Badge>
                        </div>
                        <div className="px-4 py-3 border-b border-border/50 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                          {empId && (
                            <div className="text-xs">
                              <p className="text-muted-foreground font-medium">Employee ID</p>
                              <p className="font-mono font-semibold text-blue-600 dark:text-blue-400">{empId}</p>
                            </div>
                          )}
                          {orgId && (
                            <div className="text-xs">
                              <p className="text-muted-foreground font-medium">Organization ID</p>
                              <p className="font-mono font-semibold text-blue-600 dark:text-blue-400">{orgId}</p>
                            </div>
                          )}
                        </div>
                        <div className="py-2">
                          <button
                            onClick={handleProfileClick}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-foreground hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <UserCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>My Profile</span>
                          </button>
                          <Separator className="my-1" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Logout</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.header>
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="container max-w-full p-4 md:p-6 lg:p-8"
            >
              {children}
            </motion.div>
            <motion.footer
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-t border-white/20 dark:border-slate-700/50 px-6 py-4 mt-8"
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>© 2025</span>
                  <span className="font-semibold text-foreground">FinFlux</span>
                  <span className="hidden sm:inline">• All rights reserved</span>
                </div>
                <div className="flex items-center gap-4">
                  <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</a>
                  <Separator orientation="vertical" className="h-4" />
                  <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</a>
                  <Separator orientation="vertical" className="h-4" />
                  <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Support</a>
                </div>
              </div>
            </motion.footer>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
