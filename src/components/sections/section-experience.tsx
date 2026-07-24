"use client";

import {
  Activity,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  FlaskConical,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Button, Card, Metric } from "@/components/ui/primitives";

type SectionConfig = {
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof Shield;
  filters: string[];
  metrics: Array<[string, string, string]>;
  columns: string[];
  rows: Array<{ id: string; title: string; subtitle: string; values: string[]; status: string }>;
  insight: { title: string; body: string; action: string };
};

const configs: Record<string, SectionConfig> = {
  teams: {
    eyebrow: "LEAGUE INTELLIGENCE", title: "Team power center", icon: Shield,
    description: "Live team strength, form, market movement, and model-adjusted rankings across today’s slate.",
    filters: ["All teams", "American League", "National League", "Trending"],
    metrics: [["30", "Teams tracked", "Full MLB coverage"], ["8", "Positive movers", "Last 24 hours"], ["94.8%", "Data freshness", "Live feeds healthy"]],
    columns: ["Power rank", "Form", "Model rating"],
    rows: [
      { id: "lad", title: "Los Angeles Dodgers", subtitle: "53-31 · NL West", values: ["#1", "8-2", "92.4"], status: "Elite" },
      { id: "sea", title: "Seattle Mariners", subtitle: "47-38 · AL West", values: ["#4", "7-3", "88.7"], status: "Rising" },
      { id: "hou", title: "Houston Astros", subtitle: "54-45 · AL West", values: ["#7", "6-4", "84.1"], status: "Strong" },
      { id: "nyy", title: "New York Yankees", subtitle: "48-35 · AL East", values: ["#9", "5-5", "81.6"], status: "Watch" },
    ],
    insight: { title: "Seattle owns the slate’s sharpest team-level edge", body: "Bullpen depth and a favorable starter matchup lift Seattle 4.2 ranking points above the current market consensus.", action: "Open team report" },
  },
  players: {
    eyebrow: "PLAYER MODELS", title: "Player intelligence", icon: UserRound,
    description: "Performance projections, availability, recent form, and matchup-specific player advantages.",
    filters: ["All players", "Batters", "Pitchers", "Hot form"],
    metrics: [["842", "Players modeled", "Active rosters"], ["26", "Form signals", "Above threshold"], ["12", "Injury updates", "Reviewed today"]],
    columns: ["Projection", "Form", "Matchup"],
    rows: [
      { id: "julio", title: "Julio Rodríguez", subtitle: "SEA · CF", values: [".284 AVG", "+18%", "Favorable"], status: "Hot" },
      { id: "ohtani", title: "Shohei Ohtani", subtitle: "LAD · DH", values: ["1.02 OPS", "+12%", "Elite"], status: "Elite" },
      { id: "cole", title: "Gerrit Cole", subtitle: "NYY · SP", values: ["6.4 K", "Stable", "Neutral"], status: "Confirmed" },
      { id: "tucker", title: "Kyle Tucker", subtitle: "HOU · RF", values: [".371 OBP", "+9%", "Positive"], status: "Rising" },
    ],
    insight: { title: "Julio Rodríguez is accelerating at the right time", body: "Contact quality and sprint-speed inputs have improved across five consecutive games, creating three actionable prop angles.", action: "Review player model" },
  },
  props: {
    eyebrow: "PROP INTELLIGENCE", title: "Highest-value player props", icon: Target,
    description: "Ranked prop opportunities using projection variance, matchup quality, and current market price.",
    filters: ["Top value", "Hits", "Strikeouts", "Total bases"],
    metrics: [["12", "Qualified props", "7%+ model edge"], ["4", "Strong plays", "80%+ confidence"], ["+11.8%", "Average edge", "Qualified board"]],
    columns: ["Projection", "Market", "Edge"],
    rows: [
      { id: "jr-tb", title: "Julio Rodríguez O1.5 TB", subtitle: "SEA vs SF · 7:10 PM", values: ["2.1", "+105", "+14.2%"], status: "Best play" },
      { id: "gc-k", title: "Gerrit Cole O6.5 K", subtitle: "NYY vs BOS · 7:05 PM", values: ["7.4", "-110", "+10.8%"], status: "Strong" },
      { id: "so-hr", title: "Shohei Ohtani HR", subtitle: "LAD vs COL · 8:10 PM", values: ["31%", "+245", "+8.9%"], status: "Value" },
      { id: "kt-h", title: "Kyle Tucker O0.5 Hits", subtitle: "HOU vs CHW · 8:10 PM", values: ["78%", "-185", "+7.1%"], status: "Watch" },
    ],
    insight: { title: "Rodríguez total bases leads the prop board", body: "His expected total-bases distribution clears the market line in 58% of simulations, with the largest advantage against middle relief.", action: "Build prop card" },
  },
  community: {
    eyebrow: "ANALYST HUB", title: "Community intelligence", icon: Sparkles,
    description: "Follow sharp analysts, compare verified cards, and see which ideas are earning conviction.",
    filters: ["For you", "Following", "Trending", "Verified"],
    metrics: [["2,481", "Active analysts", "Online today"], ["386", "Cards shared", "Last 24 hours"], ["64.2%", "Community win rate", "Seven-day sample"]],
    columns: ["Record", "Conviction", "Engagement"],
    rows: [
      { id: "maya", title: "Maya Chen", subtitle: "@edgecraft · Elite Analyst", values: ["18-9", "High", "842"], status: "Following" },
      { id: "devon", title: "Devon Price", subtitle: "@numbersgame · Verified", values: ["22-13", "High", "611"], status: "Trending" },
      { id: "alina", title: "Alina Torres", subtitle: "@diamonddata · Pro", values: ["16-8", "Medium", "494"], status: "Verified" },
      { id: "marcus", title: "Marcus Lee", subtitle: "@marketread · Elite Analyst", values: ["27-15", "High", "903"], status: "Popular" },
    ],
    insight: { title: "Consensus is building around Seattle", body: "Seventy-one percent of verified analyst cards include Seattle ML, but prop exposure remains balanced across the community.", action: "Explore consensus" },
  },
  friends: {
    eyebrow: "YOUR NETWORK", title: "Friends and rivals", icon: Users,
    description: "Track the analysts you know, compare weekly performance, and invite friends into private competitions.",
    filters: ["All friends", "Online", "Rivals", "Requests"],
    metrics: [["48", "Friends", "12 online"], ["#3", "Friend rank", "This month"], ["6", "Active challenges", "2 ending today"]],
    columns: ["Rating", "This week", "Status"],
    rows: [
      { id: "maya-f", title: "Maya Chen", subtitle: "Elite Analyst · Online", values: ["2810", "+8.4u", "Online"], status: "Challenge" },
      { id: "devon-f", title: "Devon Price", subtitle: "Verified · 4m ago", values: ["2692", "+5.1u", "Active"], status: "Message" },
      { id: "alina-f", title: "Alina Torres", subtitle: "Pro · 22m ago", values: ["2640", "+3.8u", "Active"], status: "Challenge" },
      { id: "marcus-f", title: "Marcus Lee", subtitle: "Elite Analyst · Online", values: ["2844", "+9.2u", "Online"], status: "Rival" },
    ],
    insight: { title: "Your closest weekly race is with Maya", body: "You trail by 0.7 units with four shared matchups remaining. Your model has stronger exposure on Seattle and Houston.", action: "Open comparison" },
  },
  leaderboard: {
    eyebrow: "GLOBAL RANKINGS", title: "Elite analyst leaderboard", icon: Trophy,
    description: "Verified rankings based on risk-adjusted returns, consistency, volume, and model transparency.",
    filters: ["Global", "Friends", "Monthly", "MLB"],
    metrics: [["#47", "Your global rank", "▲ 31 this month"], ["2,724", "Current rating", "Top 2%"], ["63.8%", "Verified win rate", "412 picks"]],
    columns: ["Rating", "Win rate", "Units"],
    rows: [
      { id: "rank1", title: "1 · Marcus Lee", subtitle: "@marketread", values: ["3,104", "67.1%", "+182.4"], status: "Elite" },
      { id: "rank2", title: "2 · Maya Chen", subtitle: "@edgecraft", values: ["3,067", "66.4%", "+171.8"], status: "Elite" },
      { id: "rank3", title: "3 · Devon Price", subtitle: "@numbersgame", values: ["3,012", "65.9%", "+163.2"], status: "Elite" },
      { id: "rank47", title: "47 · Heriberto", subtitle: "@heriberto · You", values: ["2,724", "63.8%", "+124.1"], status: "Rising" },
    ],
    insight: { title: "You are on pace for the top 25", body: "Maintaining your current risk-adjusted return for 21 more verified picks projects a ranking between #19 and #27.", action: "View rating details" },
  },
  groups: {
    eyebrow: "PRIVATE COMMUNITIES", title: "Groups", icon: Users,
    description: "Collaborate on cards, run private leaderboards, and share model notes with trusted analysts.",
    filters: ["My groups", "Discover", "Invites", "Active today"],
    metrics: [["6", "Joined groups", "4 active today"], ["128", "Shared picks", "This month"], ["3", "Pending invites", "Review access"]],
    columns: ["Members", "Activity", "Your rank"],
    rows: [
      { id: "founders", title: "STRATIQA Founders", subtitle: "Private · MLB focus", values: ["142", "Very high", "#8"], status: "Member" },
      { id: "west", title: "West Coast Edges", subtitle: "Private · Multi-sport", values: ["38", "High", "#3"], status: "Member" },
      { id: "pitching", title: "Pitching Lab", subtitle: "Public · Model research", values: ["811", "High", "#24"], status: "Joined" },
      { id: "sharp", title: "Sharp Sunday", subtitle: "Invite only · Weekly card", values: ["26", "Medium", "—"], status: "Invited" },
    ],
    insight: { title: "Founders has a new consensus card", body: "Nine verified members aligned on three positions. Your Seattle model agrees with the strongest group signal.", action: "Open group card" },
  },
  alerts: {
    eyebrow: "LIVE MONITORING", title: "Alerts center", icon: Bell,
    description: "Control signals for line movement, injury news, lineup changes, and model confidence.",
    filters: ["All alerts", "Unread", "Market", "Lineups"],
    metrics: [["3", "Unread alerts", "Needs review"], ["18", "Rules active", "All healthy"], ["4.2s", "Average latency", "Real-time feeds"]],
    columns: ["Triggered", "Impact", "Rule"],
    rows: [
      { id: "alert-sea", title: "SEA ML moved through -115", subtitle: "Market movement · Seattle vs San Francisco", values: ["2m ago", "High", "Price edge"], status: "New" },
      { id: "alert-lineup", title: "Dodgers lineup confirmed", subtitle: "Lineup monitor · LAD vs COL", values: ["8m ago", "Medium", "Starter status"], status: "Reviewed" },
      { id: "alert-julio", title: "Rodríguez prop confidence +4%", subtitle: "Model signal · Total bases", values: ["14m ago", "High", "Confidence"], status: "New" },
      { id: "alert-weather", title: "Wind shift detected at Fenway", subtitle: "Weather feed · NYY vs BOS", values: ["21m ago", "Low", "Weather"], status: "New" },
    ],
    insight: { title: "Seattle price is approaching your limit", body: "Your target entry remains playable to -122. The current composite price is -118 across four tracked books.", action: "Manage alert rule" },
  },
  lab: {
    eyebrow: "STRATIQA LAB", title: "Model research workspace", icon: FlaskConical,
    description: "Test assumptions, compare model variants, and inspect the factors driving prediction changes.",
    filters: ["Experiments", "Features", "Backtests", "Datasets"],
    metrics: [["7", "Active experiments", "2 completed today"], ["+3.8%", "Best uplift", "Bullpen v3"], ["18.4k", "Simulations", "Last run"]],
    columns: ["Variant", "Lift", "Status"],
    rows: [
      { id: "bullpen-v3", title: "Bullpen leverage weighting", subtitle: "MLB moneyline · 2025 season", values: ["v3.4", "+3.8%", "Validated"], status: "Promote" },
      { id: "weather", title: "Weather interaction terms", subtitle: "Run environment model", values: ["v2.1", "+1.6%", "Testing"], status: "Running" },
      { id: "travel", title: "Travel fatigue decay", subtitle: "Team form model", values: ["v1.8", "+0.9%", "Review"], status: "Review" },
      { id: "market", title: "Market velocity feature", subtitle: "Price movement model", values: ["v4.0", "+2.4%", "Validated"], status: "Promote" },
    ],
    insight: { title: "Bullpen v3 is ready for controlled promotion", body: "The variant improved calibration and closing-line value without increasing tail risk across 18,400 simulations.", action: "Review experiment" },
  },
  settings: {
    eyebrow: "ACCOUNT CONTROL", title: "Settings", icon: Settings,
    description: "Manage your analyst profile, model preferences, notifications, privacy, and STRATIQA Elite membership.",
    filters: ["Profile", "Models", "Notifications", "Membership"],
    metrics: [["Elite", "Membership", "30 days free"], ["18", "Alert rules", "All active"], ["5", "Connected feeds", "Healthy"]],
    columns: ["Preference", "Selection", "State"],
    rows: [
      { id: "risk", title: "Risk profile", subtitle: "Controls recommendation sizing", values: ["Balanced", "1.0u max", "Synced"], status: "Edit" },
      { id: "sports", title: "Tracked leagues", subtitle: "Dashboard and alerts", values: ["MLB", "1 league", "Active"], status: "Edit" },
      { id: "delivery", title: "Alert delivery", subtitle: "Push and email notifications", values: ["Instant", "2 channels", "Enabled"], status: "Edit" },
      { id: "privacy", title: "Profile visibility", subtitle: "Community and leaderboards", values: ["Public", "Verified stats", "Visible"], status: "Edit" },
    ],
    insight: { title: "Your account is fully configured", body: "All model preferences, live feeds, and notification channels are synchronized. No action is required.", action: "Export account data" },
  },
};

const legalConfigs: Record<string, { title: string; description: string; sections: Array<[string, string]> }> = {
  privacy: {
    title: "Privacy", description: "How STRATIQA protects model activity, analyst profiles, and connected account data.",
    sections: [["Data we use", "We process account details, product interactions, verified picks, and connected feed preferences to provide analytics and community features."], ["Your controls", "Profile visibility, notification delivery, data export, and account deletion controls are available from Settings."], ["Security", "Account information is encrypted in transit and access is restricted according to operational need."]],
  },
  terms: {
    title: "Terms", description: "The operating terms for STRATIQA analytics, community features, and model insights.",
    sections: [["Analytics only", "STRATIQA provides analytical information and does not guarantee outcomes. Users remain responsible for their own decisions."], ["Community conduct", "Published records and shared cards must be accurate, respectful, and free from manipulation."], ["Account access", "Keep account credentials secure and notify support promptly when unauthorized access is suspected."]],
  },
  support: {
    title: "Support", description: "Fast help for account, data feed, model, and membership questions.",
    sections: [["Live systems", "All core model, odds, lineup, weather, and injury feeds are currently operational."], ["Priority support", "Elite members receive priority routing for account and model-data inquiries."], ["Response targets", "Critical data issues are reviewed immediately; general account requests receive a response within one business day."]],
  },
};

export function SectionExperience({ section }: { section: string }) {
  const config = configs[section];
  const legal = legalConfigs[section];
  const [filter, setFilter] = useState(config?.filters[0] ?? "");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);

  const rows = useMemo(() => {
    if (!config) return [];
    const normalized = query.trim().toLowerCase();
    return normalized
      ? config.rows.filter((row) => `${row.title} ${row.subtitle}`.toLowerCase().includes(normalized))
      : config.rows;
  }, [config, query]);

  if (legal) {
    return (
      <div className="product-page legal-page">
        <header className="product-hero">
          <div><Badge tone="accent">STRATIQA</Badge><h1>{legal.title}</h1><p>{legal.description}</p></div>
          <Badge tone="success">Updated July 24, 2026</Badge>
        </header>
        <section className="legal-grid">
          {legal.sections.map(([title, body], index) => <Card key={title}><span>0{index + 1}</span><h2>{title}</h2><p>{body}</p></Card>)}
        </section>
        {section === "support" ? <Card className="support-bar"><div><strong>Need direct help?</strong><span>Priority support is available for Elite members.</span></div><Button>Start support request</Button></Card> : null}
      </div>
    );
  }

  const Icon = config.icon;
  return (
    <div className="product-page">
      <header className="product-hero">
        <div>
          <Badge tone="accent"><Icon size={12} /> {config.eyebrow}</Badge>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <Button><Sparkles size={15} /> Generate insight</Button>
      </header>

      <section className="product-metrics">
        {config.metrics.map(([value, label, detail]) => <Card key={label}><Metric value={value} label={label} detail={detail} positive={detail.includes("▲")} /></Card>)}
      </section>

      <section className="product-toolbar">
        <div className="filter-tabs" role="tablist" aria-label={`${config.title} filters`}>
          {config.filters.map((item) => <button role="tab" aria-selected={filter === item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}
        </div>
        <label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${section}...`} aria-label={`Search ${section}`} /></label>
        <button className="icon-control" aria-label="Advanced filters"><SlidersHorizontal size={16} /></button>
      </section>

      <div className="product-layout">
        <Card className="data-panel">
          <header><span><Activity size={16} /> {filter}</span><Badge tone="success">{rows.length} RESULTS</Badge></header>
          <div className="data-head"><span>Name</span>{config.columns.map((column) => <span key={column}>{column}</span>)}<span>Action</span></div>
          <div className="data-rows">
            {rows.map((row) => (
              <div className="data-row" key={row.id}>
                <div><span className="data-avatar">{row.title.charAt(0)}</span><span><strong>{row.title}</strong><small>{row.subtitle}</small></span></div>
                {row.values.map((value) => <span key={value}>{value}</span>)}
                <button className={saved.includes(row.id) ? "saved" : ""} onClick={() => setSaved((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} aria-label={`${saved.includes(row.id) ? "Remove" : "Save"} ${row.title}`}>
                  {saved.includes(row.id) ? <Check size={14} /> : <Bookmark size={14} />} {saved.includes(row.id) ? "Saved" : row.status}
                </button>
              </div>
            ))}
            {rows.length === 0 ? <div className="empty-results"><Search size={22} /><strong>No matching results</strong><span>Try a broader name or clear the search field.</span></div> : null}
          </div>
        </Card>

        <aside className="product-rail">
          <Card className="insight-card">
            <header><span><Sparkles size={16} /> Model insight</span><Badge tone="accent">LIVE</Badge></header>
            <div><h2>{config.insight.title}</h2><p>{config.insight.body}</p><button>{config.insight.action} <ChevronRight size={14} /></button></div>
          </Card>
          <Card className="health-card">
            <header><span><Activity size={16} /> System health</span></header>
            <div><span>Model data</span><strong><i /> Live</strong></div>
            <div><span>Market feeds</span><strong><i /> Synced</strong></div>
            <div><span>Last refresh</span><strong>17s ago</strong></div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
