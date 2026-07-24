import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CircleGauge,
  CloudSun,
  Crown,
  Flame,
  Home,
  LineChart,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { Card } from "@/components/ui/primitives";

const topMatchups = [
  ["7:10 PM", "SEA", "SF", "63%", "37%"],
  ["7:05 PM", "NYY", "BOS", "58%", "42%"],
  ["8:10 PM", "LAD", "COL", "72%", "28%"],
  ["8:05 PM", "ATL", "MIA", "61%", "39%"],
];

const edges = [
  { label: "Bullpen Edge", games: "8 Games", value: "+18.4%", icon: Target, tone: "green" },
  { label: "Starting Pitching", games: "6 Games", value: "+14.7%", icon: UserRound, tone: "blue" },
  { label: "Home Field", games: "5 Games", value: "+9.6%", icon: Home, tone: "orange" },
  { label: "Market Inefficiency", games: "7 Games", value: "+12.9%", icon: TrendingUp, tone: "lime" },
  { label: "Weather Impact", games: "2 Games", value: "+7.1%", icon: CloudSun, tone: "cyan" },
];

export default function DashboardPage() {
  return (
    <div className="dashboard-page">
      <section className="dashboard-heading">
        <div><h1>Good evening, Heriberto.</h1><p>Let&apos;s find today&apos;s strongest edges.</p></div>
        <div className="live-counters">
          <div><strong>12</strong><span>Games Today</span></div>
          <div><strong>8</strong><span>Edges Found</span></div>
          <div><strong>17s</strong><span>Model Refresh</span></div>
        </div>
      </section>

      <section className="readiness-strip">
        <div><ShieldCheck /><span>Lineups<strong>Confirmed</strong></span></div>
        <div><CloudSun /><span>Weather<strong>Updated</strong></span></div>
        <div><BarChart3 /><span>Odds<strong>Synced 23s ago</strong></span></div>
        <div><Activity /><span>Injuries<strong>Active</strong></span></div>
      </section>

      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <Card className="top-play">
            <header><span><Flame size={18} /> Today&apos;s top play</span><Link href="/matchups">View All Matchups <ArrowRight size={14} /></Link></header>
            <div className="top-play-main">
              <div className="play-summary">
                <div className="team-matchup">
                  <div className="team-badge sea-badge">S</div>
                  <div><strong>SEA</strong><b>63%</b></div>
                  <div className="game-time"><span>7:10 PM</span><strong>VS</strong></div>
                  <div><strong>SF</strong><b>37%</b></div>
                  <div className="team-badge sf-badge">SF</div>
                </div>
                <h2>Seattle Mariners ML</h2>
                <div className="edge-tags"><span>Bullpen Edge</span><span>Starting Pitching</span><span>Home Advantage</span></div>
              </div>
              <div className="ring-block"><ConfidenceRing value={96} label="Confidence" size="lg" /><button>ⓘ Why?</button></div>
            </div>
            <footer>
              <div><span>Win Probability</span><strong>63%</strong></div>
              <div><span>Model Edge</span><strong>+13.2%</strong></div>
              <div><span>Value</span><strong>+18%</strong></div>
            </footer>
          </Card>

          <section className="kpi-grid">
            <Card><CircleGauge /><strong>63.8%</strong><span>WIN RATE</span><small>412 PICKS <b>▲ 2.4%</b></small></Card>
            <Card><LineChart /><strong>+124.1</strong><span>UNITS PROFIT</span><small>12.4% ROI <b>▲ 3.7%</b></small></Card>
            <Card><Flame /><strong>18</strong><span>DAY STREAK</span><small>Best: 21</small></Card>
            <Card><ShieldCheck /><strong>2811</strong><span>PEAK RATING</span><small>May 12, 2025</small></Card>
            <Card><Target /><strong>98</strong><span>CONFIDENCE SCORE</span><small>Top 1%</small></Card>
          </section>

          <Card className="edge-breakdown">
            <header><div><span><Target size={18} /> Key edge breakdown</span><p>How our model sees today&apos;s biggest edges.</p></div><Link href="/matchups">View All Edges <ArrowRight size={14} /></Link></header>
            <div className="edge-grid">
              {edges.map(({ label, games, value, icon: Icon, tone }) => (
                <div className={`edge-item ${tone}`} key={label}>
                  <header><Icon size={22} /><div><strong>{label}</strong><span>{games}</span></div></header>
                  <b>{value}</b>
                  <div className="mini-bars">{[2,3,4,5,6,7,8,9].map((height) => <i key={height} style={{ height: `${height * 2}px` }} />)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="analyst-card">
          <header><span><Crown size={17} /> Your analyst card</span><button aria-label="Share analyst card"><Share2 size={15} /> Share</button></header>
          <div className="analyst-portrait">
            <div className="portrait-ring"><Image src="/analyst-heriberto.png" alt="Heriberto" width={174} height={174} priority /></div>
            <span><Crown size={15} /> Elite Analyst</span>
          </div>
          <h2>Heriberto <b>✓</b></h2><p>Top 2% of all analysts</p>
          <div className="analyst-stats">
            <div><strong>2724</strong><span>RATING</span></div>
            <div><strong>#47 <b>▲31</b></strong><span>GLOBAL RANK</span></div>
            <div><strong>63.8%</strong><span>WIN RATE</span></div>
          </div>
          <Link href="/analysts/heriberto">View Full Analyst Profile <ArrowRight size={15} /></Link>
        </Card>

        <aside className="intel-rail">
          <Card className="ai-coach">
            <header><span><Sparkles size={18} /> AI Coach</span><Link href="/coach">Open Coach <ArrowRight size={13} /></Link></header>
            <h3>Good evening, Heriberto.</h3><p>Here&apos;s your game plan for today.</p>
            <div className="coach-list">
              <Link href="/coach"><Star /><span><strong>Start with Seattle ML</strong><small>Strongest edge on the board.</small></span></Link>
              <Link href="/props"><Target /><span><strong>Check Julio Rodriguez Props</strong><small>3 high value opportunities.</small></span></Link>
              <Link href="/matchups"><AlertTriangle /><span><strong>Fade 2 games today</strong><small>Low value or high risk matchups.</small></span></Link>
            </div>
          </Card>

          <Card className="rail-card">
            <header><span>Top matchups today</span><Link href="/matchups">View All <ArrowRight size={12} /></Link></header>
            <div className="rail-matchups">
              {topMatchups.map(([time, away, home, awayWin, homeWin]) => (
                <Link href="/matchups" key={`${away}-${home}`}>
                  <time>{time}</time><strong>{away}</strong><span>VS</span><b>{home}</b><em>{awayWin}</em><i>{homeWin}</i>
                  <div><u style={{ width: awayWin }} /><u style={{ width: homeWin }} /></div>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="rail-card market-movers">
            <header><span>Market movers</span><Link href="/alerts">View All <ArrowRight size={12} /></Link></header>
            <div><span>SEA ML</span><small>-120 → +104</small><b><TrendingUp size={12} /> 24</b></div>
            <div><span>NYY ML</span><small>+110 → -110</small><em><TrendingDown size={12} /> 20</em></div>
            <div><span>LAD ML</span><small>-150 → -135</small><b><TrendingUp size={12} /> 15</b></div>
          </Card>

          <Card className="rail-card recent-activity">
            <header><span>Your recent activity</span><Link href="/analysts/heriberto">View All <ArrowRight size={12} /></Link></header>
            <div><i><Check size={16} /></i><span><strong>Seattle Mariners ML</strong><small>2h ago</small></span><b>Won</b><em>+1.00u</em></div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
