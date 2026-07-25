"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  Crown,
  Flame,
  FlaskConical,
  Gauge,
  Menu,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "AI Coach", href: "/coach", icon: Sparkles, badge: "V15" },
  { label: "Matchups", href: "/matchups", icon: Target },
  { label: "Teams", href: "/teams", icon: Shield },
  { label: "Players", href: "/players", icon: UserRound },
  { label: "Props", href: "/props", icon: ChartNoAxesCombined, badge: "12" },
];

const community = [
  { label: "Community", href: "/community", icon: Sparkles, badge: "NEW" },
  { label: "Friends", href: "/friends", icon: Users },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Groups", href: "/groups", icon: Users },
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
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            href={item.href}
            className={active ? "nav-item active" : "nav-item"}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon size={18} strokeWidth={active ? 2.4 : 1.9} />
            <span>{item.label}</span>
            {item.badge ? <em>{item.badge}</em> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  if (pathname === "/" || pathname === "/onboarding") return <>{children}</>;
  return (
    <div className="app-shell">
      <button className="mobile-menu" onClick={() => setOpen((value) => !value)} aria-label="Toggle navigation">
        <Menu size={20} />
      </button>

      <aside className={open ? "sidebar open" : "sidebar"}>
        <Link href="/dashboard" className="brand" onClick={() => setOpen(false)}>
          <strong>STRATI<span>Q</span>A</strong>
          <small>Smarter models. Better decisions.</small>
        </Link>

        <Link href="/analysts/heriberto" className="sidebar-profile">
          <header>
            <div className="sidebar-avatar"><span>H</span><i /></div>
            <div><strong>Heriberto <b>✓</b></strong><span>Founding Member</span><em><Crown size={11} /> Elite Analyst</em></div>
          </header>
          <div className="sidebar-rating">
            <div><strong>2724</strong><span>RATING</span></div>
            <div><strong>▲ 42</strong><span>THIS WEEK</span></div>
          </div>
          <div className="sidebar-rank"><strong>Top 2%</strong><span>of all analysts</span><i /></div>
          <div className="profile-link">View Profile <ChevronRight size={15} /></div>
        </Link>

        <nav>
          <NavGroup items={navigation} onNavigate={() => setOpen(false)} />
          <NavGroup label="ANALYST HUB" items={community} onNavigate={() => setOpen(false)} />
          <NavGroup label="TOOLS" items={tools} onNavigate={() => setOpen(false)} />
        </nav>

        <div className="membership">
          <span>STRATIQA ELITE</span>
          <strong>30 DAYS FREE</strong>
          <small>Founding members access.</small>
          <Link href="/settings">View Membership</Link>
        </div>
      </aside>

      {open ? <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}

      <div className="app-main">
        <header className="topbar">
          <label className="search-box">
            <Search size={19} />
            <input aria-label="Search" placeholder="Search teams, players, props..." />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="topbar-actions">
            <span className="live-pill"><i /> LIVE</span>
            <button aria-label="Notifications"><Bell size={20} /><b>3</b></button>
            <span className="streak"><Flame size={20} /> 18</span>
            <Link href="/account" className="top-avatar" aria-label="Account and preferences"><Image src="/analyst-heriberto.png" alt="Heriberto" width={42} height={42} /><i /></Link>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="system-footer">
          <div><span>Model Refresh: 17s ago</span><span>Odds Sync: 23s ago</span><span>Last Injury Feed: Just now</span></div>
          <div><strong>STRATIQA v15.3</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></div>
        </footer>
      </div>
    </div>
  );
}
