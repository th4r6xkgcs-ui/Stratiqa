"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  Crown,
  FlaskConical,
  Gauge,
  Menu,
  Settings,
  Shield,
  Target,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Matchups", href: "/matchups", icon: Target },
  { label: "Teams", href: "/teams", icon: Shield },
  { label: "Players", href: "/players", icon: UserRound },
  { label: "Props", href: "/props", icon: ChartNoAxesCombined, badge: "12" },
];

const community = [
  { label: "Community", href: "/community", icon: Users },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const tools = [
  { label: "Alerts", href: "/alerts", icon: Bell, badge: "3" },
  { label: "Stratiqa Lab", href: "/lab", icon: FlaskConical },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NavGroup({
  label,
  items,
  onNavigate,
}: {
  label?: string;
  items: typeof navigation;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="nav-group">
      {label ? <p>{label}</p> : null}
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            href={item.href}
            className={active ? "nav-item active" : "nav-item"}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon size={18} strokeWidth={active ? 2.25 : 1.8} />
            <span>{item.label}</span>
            {item.badge ? <em>{item.badge}</em> : null}
            {active ? <ChevronRight className="nav-chevron" size={15} /> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        onClick={() => setOpen((value) => !value)}
        aria-label="Toggle navigation"
      >
        <Menu size={20} />
      </button>
      <aside className={open ? "sidebar open" : "sidebar"}>
        <Link href="/dashboard" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">S</span>
          <span><strong>STRATIQA</strong><small>SPORTS INTELLIGENCE</small></span>
        </Link>
        <div className="profile">
          <div className="avatar">H<span /></div>
          <div><strong>Heriberto</strong><span><Crown size={11} /> Elite Analyst</span></div>
          <small>2724</small>
        </div>
        <nav>
          <NavGroup items={navigation} onNavigate={() => setOpen(false)} />
          <NavGroup label="ANALYST HUB" items={community} onNavigate={() => setOpen(false)} />
          <NavGroup label="TOOLS" items={tools} onNavigate={() => setOpen(false)} />
        </nav>
        <div className="membership">
          <span>STRATIQA ELITE</span>
          <strong>Founding member</strong>
          <small>Full access is active</small>
        </div>
        <div className="system-status"><span /> All systems operational</div>
      </aside>
      {open ? <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      <main className="content">{children}</main>
    </div>
  );
}
