import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Trophy, 
  Users, 
  BarChart3, 
  ArrowLeftRight, 
  MessageSquare, 
  ShieldCheck,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/leaderboard', label: 'Leaderboard', icon: BarChart3 },
  { href: '/compare', label: 'Compare', icon: ArrowLeftRight },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/admin', label: 'Admin', icon: ShieldCheck },
];

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <h1 className="text-2xl font-heading font-bold text-primary tracking-tight">
              CueStats
            </h1>
            <p className="text-xs text-muted-foreground font-mono">FREMONT OPEN</p>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md transition-colors font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
