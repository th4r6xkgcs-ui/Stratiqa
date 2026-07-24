import Link from "next/link";
import {
  ArrowRight,
  CloudSun,
  Flame,
  LineChart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { Badge, Button, Card, Metric } from "@/components/ui/primitives";

const games = [
  ["SEA", "SF", "63%", "7:10 PM"],
  ["NYY", "BOS", "58%", "7:05 PM"],
  ["LAD", "COL", "72%", "8:10 PM"],
];

export default function DashboardPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <Badge tone="success">LIVE MODEL</Badge>
          <h1>Good evening, Heriberto.</h1>
          <p>Your command center for today&apos;s strongest edges.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary">View activity</Button>
          <Button>Build a card <ArrowRight size={16} /></Button>
        </div>
      </header>

      <section className="status-strip">
        <div><ShieldCheck size={16} /><span>Lineups<strong>Confirmed</strong></span></div>
        <div><CloudSun size={16} /><span>Weather<strong>Updated</strong></span></div>
        <div><LineChart size={16} /><span>Markets<strong>Synced 23s ago</strong></span></div>
      </section>

      <section className="dashboard-grid">
        <Card className="featured-play">
          <header>
            <span><Flame size={17} /> Today&apos;s top play</span>
            <Badge tone="accent">#1 EDGE</Badge>
          </header>
          <div className="featured-body">
            <div>
              <div className="versus-row">
                <div className="team-logo sea">SEA</div>
                <div><strong>Seattle Mariners</strong><small>47-38</small></div>
                <span>VS</span>
                <div className="team-logo sf">SF</div>
                <div><strong>San Francisco Giants</strong><small>45-40</small></div>
              </div>
              <Badge tone="success">BULLPEN EDGE</Badge>
              <h2>Seattle Mariners ML</h2>
              <p>Our strongest model advantage combines late-inning depth, starting pitching, and favorable market movement.</p>
            </div>
            <ConfidenceRing value={96} size="lg" />
          </div>
          <footer className="metric-row">
            <Metric label="Win probability" value="63%" />
            <Metric label="Model edge" value="+13.2%" detail="+4.1% today" positive />
            <Metric label="Market price" value="-118" />
          </footer>
        </Card>

        <Card className="coach-card">
          <header><span><Sparkles size={17} /> AI briefing</span><Badge tone="success">READY</Badge></header>
          <h2>Three moves worth your attention.</h2>
          <div className="briefing-list">
            <Link href="/matchups"><span>01</span><div><strong>Start with Seattle ML</strong><small>Strongest edge on the board</small></div><ArrowRight size={16} /></Link>
            <Link href="/matchups"><span>02</span><div><strong>Watch Dodgers -1.5</strong><small>Model confidence moved to 88%</small></div><ArrowRight size={16} /></Link>
            <Link href="/matchups"><span>03</span><div><strong>Fade two low-value games</strong><small>Limited upside at current prices</small></div><ArrowRight size={16} /></Link>
          </div>
        </Card>
      </section>

      <section className="metric-grid">
        <Card><Metric label="Win rate" value="63.8%" detail="+2.4% this month" positive /></Card>
        <Card><Metric label="Units profit" value="+124.1" detail="12.4% ROI" positive /></Card>
        <Card><Metric label="Active streak" value="18 days" detail="Personal best: 21" /></Card>
        <Card><Metric label="Confidence score" value="98" detail="Top 1% of analysts" positive /></Card>
      </section>

      <Card className="market-card">
        <header><span><TrendingUp size={17} /> Top matchups today</span><Link href="/matchups">View all <ArrowRight size={14} /></Link></header>
        <div className="game-table">
          {games.map(([away, home, probability, time]) => (
            <Link href="/matchups" key={`${away}-${home}`}>
              <time>{time}</time><strong>{away}</strong><span>vs</span><strong>{home}</strong>
              <div><i style={{ width: probability }} /></div><b>{probability}</b><ArrowRight size={15} />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
