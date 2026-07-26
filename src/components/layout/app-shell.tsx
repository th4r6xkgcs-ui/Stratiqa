"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChartNoAxesCombined,
  ChevronRight,
  FlaskConical,
  Gauge,
  Menu,
  Search,
  Sparkles,
  Target,
  Trophy,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { AddPickLauncher } from "@/components/picks/add-pick-launcher";
import { PickSlip } from "@/components/picks/pick-slip";

const navigation = [
  { label: "Home", href: "/dashboard", icon: Gauge },
  { label: "Find Picks", href: "/matchups", icon: Target },
  { label: "Player Props", href: "/props", icon: ChartNoAxesCombined, badge: "12" },
  { label: "My Performance", href: "/picks", icon: Trophy, badge: "RATING" },
];

const intelligence = [
  { label: "AI Coach", href: "/coach", icon: Sparkles, badge: "AI" },
  { label: "Model Lab", href: "/lab", icon: FlaskConical },
];

const community = [
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const tools = [
  { label: "Account & Privacy", href: "/account", icon: UserRound },
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

        <Link href="/picks" className="sidebar-profile" onClick={() => setOpen(false)}>
          <header>
            <div className="sidebar-performance-icon"><Trophy /></div>
            <div><strong>My Performance</strong><span>Rating & records</span><em>UPDATED AUTOMATICALLY</em></div>
          </header>
          <p className="sidebar-performance-copy">See your rating, strongest categories, parlays, and confirmed results.</p>
          <div className="profile-link">Open performance <ChevronRight size={15} /></div>
        </Link>

        <nav>
          <NavGroup items={navigation} onNavigate={() => setOpen(false)} />
          <NavGroup label="INTELLIGENCE" items={intelligence} onNavigate={() => setOpen(false)} />
          <NavGroup label="COMMUNITY" items={community} onNavigate={() => setOpen(false)} />
          <NavGroup label="ACCOUNT" items={tools} onNavigate={() => setOpen(false)} />
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
            <AddPickLauncher />
            <span className="live-pill"><i /> LIVE</span>
            <Link href="/dashboard#updates" aria-label="Notifications"><Bell size={20} /></Link>
            <Link href="/account" className="top-avatar" aria-label="Account and preferences"><Image src="/analyst-heriberto.png" alt="Account profile" width={42} height={42} /><i /></Link>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="system-footer">
          <div><span>Automatic settlement</span><span>Verified ratings</span><span>Privacy controls active</span></div>
          <div><strong>STRATIQA v16.2</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></div>
        </footer>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <Link key={item.href} href={item.href} className={active ? "active" : ""}>
            <Icon />
            <span>{item.label === "My Performance" ? "Performance" : item.label}</span>
          </Link>;
        })}
      </nav>
      <PickSlip />
    </div>
  );
}
