'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { NotificationCenter } from './notification-center';
import {
  HardHat,
  LayoutDashboard,
  FolderKanban,
  Building2,
  MessageSquare,
  FileText,
  FileStack,
  ClipboardCheck,
  DollarSign,
  Calculator,
  CheckCircle,
  User,
  LogOut,
  Menu,
  X,
  Palette,
  Calendar,
  Wallet,
  Receipt,
  Landmark,
  Users,
  Wrench,
  BarChart3,
  Shield,
  Brain,
  Home,
  Boxes,
  Database,
  Lock,
  Zap,
  TrendingUp,
  FileCheck,
  Briefcase,
  Globe,
  BookOpen,
  Target,
  Activity,
} from 'lucide-react';
import { isMasterAdmin, isManagement, isContractor, isLender, getRoleDisplayName, getRoleBadgeColor } from '@/lib/roles';

// SiteSync OS Module Structure
// SiteSync Vault™ - Acquisition Module (LOIs, Approvals, Properties)
const vaultNavigation = [
  { name: 'Properties', href: '/properties', icon: Building2 },
  { name: 'ROI Calculator', href: '/roi-calculator', icon: TrendingUp },
  { name: 'Lender Portal', href: '/lender-portal', icon: Landmark },
];

// SiteSync Build™ - Build Module (Project Milestones)
const buildNavigation = [
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'Gantt', href: '/gantt', icon: Calendar },
  { name: 'RFIs', href: '/rfis', icon: MessageSquare },
  { name: 'Submittals', href: '/submittals', icon: ClipboardCheck },
  { name: 'Change Orders', href: '/change-orders', icon: DollarSign },
  { name: 'Punch List', href: '/punch-items', icon: CheckCircle },
  { name: 'Daily Reports', href: '/daily-reports', icon: FileText },
  { name: 'Design Services', href: '/design-services', icon: Palette },
];

// SiteSync Ops™ - Operations Module (Invoices, Expenses)
const opsNavigation = [
  { name: 'Cost Analysis', href: '/cost-analysis', icon: Calculator },
  { name: 'Budgeting', href: '/budgeting', icon: Wallet },
  { name: 'Draw Requests', href: '/draw-requests', icon: Receipt },
  { name: 'Tenants', href: '/tenant-management', icon: Users },
  { name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { name: 'Documents', href: '/documents', icon: FileStack },
];

// Quantum Ledger™ - Treasury & Financial Intelligence
const treasuryNavigation = [
  { name: 'Quantum Ledger', href: '/ledger', icon: BookOpen },
  { name: 'Milestones', href: '/milestones', icon: Target },
];

// Portals
const portalNavigation = [
  { name: 'Contractor Portal', href: '/contractor-portal', icon: HardHat },
];

// Intelligence & Planning
const intelligenceNavigation = [
  { name: 'AI Orchestrator', href: '/ai-assistant', icon: Brain },
  { name: 'GIS Intelligence', href: '/gis', icon: Globe },
  { name: 'Scenarios', href: '/scenarios', icon: Target },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

// Combined navigation for backward compatibility
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ...vaultNavigation,
  ...buildNavigation,
  ...opsNavigation,
  ...treasuryNavigation,
  ...intelligenceNavigation,
];

const secondaryNavigation = portalNavigation;

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession() || {};
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userRole = (session?.user as any)?.role;
  const isAdmin = isMasterAdmin(userRole);
  const isManager = isManagement(userRole);
  const isContractorUser = isContractor(userRole);
  const isLenderUser = isLender(userRole);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  const userInitials = session?.user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() ?? 'U';

  // Filter navigation based on role
  const filteredNavigation = navigation.filter(item => {
    // Contractors only see limited navigation
    if (isContractorUser) {
      return ['Dashboard', 'Projects', 'RFIs', 'Daily Reports', 'Documents'].includes(item.name);
    }
    // Lenders have limited view
    if (isLenderUser) {
      return ['Dashboard', 'Projects', 'Draw Requests', 'Documents', 'Analytics'].includes(item.name);
    }
    return true;
  });

  const filteredSecondaryNav = secondaryNavigation.filter(item => {
    // Contractors see contractor portal prominently
    if (isContractorUser) {
      return ['Contractor Portal', 'Daily Reports', 'Documents'].includes(item.name);
    }
    // Lenders see lender portal
    if (isLenderUser) {
      return ['Lender Portal', 'Documents'].includes(item.name);
    }
    return true;
  });

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-blue-600 rounded-lg flex items-center justify-center group-hover:shadow-lg transition-shadow">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent">
                SiteSync OS
              </span>
              <span className="hidden md:block text-xs text-muted-foreground -mt-1">Asset Management Intelligence</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Back to Dashboard for non-dashboard pages */}
            {pathname !== '/dashboard' && (
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Home className="w-4 h-4" />
                  <span className="text-sm">Home</span>
                </Button>
              </Link>
            )}
            
            {filteredNavigation.slice(0, 8).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`flex items-center space-x-1 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm">{item.name}</span>
                  </Button>
                </Link>
              );
            })}
            {/* More dropdown for additional items */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-100">
                  <Menu className="w-4 h-4 mr-1" />
                  <span className="text-sm">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>More Modules</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[...filteredNavigation.slice(8), ...filteredSecondaryNav].map((item) => {
                  const Icon = item.icon;
                  return (
                    <DropdownMenuItem key={item.name} onClick={() => router.push(item.href)}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.name}
                    </DropdownMenuItem>
                  );
                })}
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="flex items-center">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin Tools
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => router.push('/analytics')}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      System Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                      <Brain className="mr-2 h-4 w-4" />
                      Simulations
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2">
            {/* Admin Badge */}
            {isAdmin && (
              <Badge variant="outline" className="hidden md:flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200">
                <Shield className="w-3 h-3" />
                Admin
              </Badge>
            )}
            
            {/* Notification Center */}
            <NotificationCenter />

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>

            {/* User dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-orange-500 text-white text-sm font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:block text-sm font-medium">{session?.user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{session?.user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                    <Badge className={`text-xs mt-2 w-fit ${getRoleBadgeColor(userRole)}`}>
                      {getRoleDisplayName(userRole)}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {isContractorUser && (
                  <DropdownMenuItem onClick={() => router.push('/contractor-portal')}>
                    <HardHat className="mr-2 h-4 w-4" />
                    Contractor Portal
                  </DropdownMenuItem>
                )}
                {isLenderUser && (
                  <DropdownMenuItem onClick={() => router.push('/lender-portal')}>
                    <Landmark className="mr-2 h-4 w-4" />
                    Lender Portal
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-1 max-h-[70vh] overflow-y-auto">
            {/* Quick Home Link */}
            <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
              <Button
                variant="ghost"
                className="w-full justify-start flex items-center space-x-3 bg-blue-50 text-blue-700 mb-2"
              >
                <Home className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Button>
            </Link>
            
            <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Main</p>
            {filteredNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start flex items-center space-x-3 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
            <p className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase mt-4">Portals & Tools</p>
            {filteredSecondaryNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link key={item.name} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start flex items-center space-x-3 ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              );
            })}
            
            {/* Admin Section for Mobile */}
            {isAdmin && (
              <>
                <p className="px-3 py-2 text-xs font-semibold text-purple-600 uppercase mt-4 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin Tools
                </p>
                <Link href="/analytics" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start flex items-center space-x-3 text-purple-700"
                  >
                    <BarChart3 className="w-5 h-5" />
                    <span>System Analytics</span>
                  </Button>
                </Link>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-start flex items-center space-x-3 text-purple-700"
                  >
                    <Brain className="w-5 h-5" />
                    <span>Run Simulations</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
