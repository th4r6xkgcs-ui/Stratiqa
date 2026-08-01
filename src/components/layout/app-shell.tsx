"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Bell,
  Activity,
  ChartNoAxesCombined,
  ChevronRight,
  Command,
  FlaskConical,
  Gauge,
  Menu,
  Search,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AddPickLauncher } from "@/components/picks/add-pick-launcher";
import { PickSlip } from "@/components/picks/pick-slip";

const navigation = [
  { label: "Home", href: "/dashboard", icon: Gauge },
  { label: "Find Picks", href: "/matchups", icon: Target },
  { label: "Game Center", href: "/games", icon: Activity, badge: "LIVE" },
  { label: "Player Props", href: "/props", icon: ChartNoAxesCombined, badge: "12" },
  { label: "My Performance", href: "/picks", icon: Trophy, badge: "RATING" },
];

const intelligence = [
  { label: "AI Coach", href: "/coach", icon: Sparkles, badge: "AI" },
  { label: "Model Lab", href: "/lab", icon: FlaskConical },
];

const community = [
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "My Rivals", href: "/rivals", icon: Swords },
  { label: "Model Clubs", href: "/clubs", icon: Users },
];

const tools = [
  { label: "Account & Privacy", href: "/account", icon: UserRound },
  { label: "Data Status", href: "/status", icon: Activity },
];
const commandItems: Array<{ label: string; href: string; icon: typeof Gauge; badge?: string }> = [...navigation, ...intelligence, ...community, ...tools];

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
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setCommandOpen(true); }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  if (pathname === "/" || pathname === "/onboarding") return <>{children}</>;
  const commandMatches = commandItems.filter((item) => item.label.toLowerCase().includes(commandQuery.trim().toLowerCase())).slice(0, 8);
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
            <div><strong>Your performance</strong><span>Rating, records & pick cards</span></div>
          </header>
          <div className="profile-link">Open tracker <ChevronRight size={15} /></div>
        </Link>

        <nav>
          <NavGroup items={navigation} onNavigate={() => setOpen(false)} />
          <NavGroup label="INTELLIGENCE" items={intelligence} onNavigate={() => setOpen(false)} />
          <NavGroup label="COMMUNITY" items={community} onNavigate={() => setOpen(false)} />
          <NavGroup label="ACCOUNT" items={tools} onNavigate={() => setOpen(false)} />
        </nav>

      </aside>

      {open ? <button className="scrim" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}
      {commandOpen ? <div className="command-backdrop" role="presentation" onMouseDown={() => setCommandOpen(false)}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Quick navigation" onMouseDown={(event) => event.stopPropagation()}><header><Command /><input autoFocus value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Jump to a page…" aria-label="Search pages" /><kbd>ESC</kbd></header><div>{commandMatches.length ? commandMatches.map((item) => { const Icon = item.icon; return <Link href={item.href} key={item.href} onClick={() => { setCommandOpen(false); setCommandQuery(""); }}><Icon /><span><strong>{item.label}</strong><small>{item.href}</small></span>{item.badge ? <em>{item.badge}</em> : null}<ChevronRight /></Link>; }) : <p>No pages match that search.</p>}</div><footer><span><Command /> Quick navigation</span><span>Select a page to continue</span></footer></section></div> : null}

      <div className="app-main">
        <header className="topbar">
          <label className="search-box" onClick={() => setCommandOpen(true)}>
            <Search size={19} />
            <input aria-label="Search pages" readOnly placeholder="Search STRATIQA…" onFocus={() => setCommandOpen(true)} />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="topbar-actions">
            <AddPickLauncher />
            <span className="live-pill"><i /> GAME TRACKING</span>
            <Link href="/dashboard#updates" aria-label="Notifications"><Bell size={20} /></Link>
            <Link href="/account" className="top-avatar" aria-label="Account and preferences"><Image src="/analyst-heriberto.png" alt="Account profile" width={42} height={42} /><i /></Link>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="system-footer">
          <div><span>Automatic settlement</span><span>Verified ratings</span><span>Privacy controls active</span></div>
          <div><strong>STRATIQA v16.9</strong><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></div>
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
