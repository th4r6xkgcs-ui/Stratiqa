import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3, SlidersHorizontal, Sparkles, Target, TrendingUp } from "lucide-react";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { Badge, Button, Card, Metric } from "@/components/ui/primitives";

const games = [
  { team: "Seattle Mariners", abbr: "SEA", record: "47-38", opponent: "San Francisco Giants", opp: "SF", opponentRecord: "45-40", confidence: 96, probability: 63, time: "7:10 PM", bet: "Mariners ML", odds: "-118", edge: "+13.2%", value: "+18%", label: "Best play" },
  { team: "Los Angeles Dodgers", abbr: "LAD", record: "53-31", opponent: "Colorado Rockies", opp: "COL", opponentRecord: "29-55", confidence: 88, probability: 72, time: "8:10 PM", bet: "Dodgers -1.5", odds: "-110", edge: "+10.4%", value: "+14%", label: "Elite value" },
  { team: "Houston Astros", abbr: "HOU", record: "54-45", opponent: "Chicago White Sox", opp: "CHW", opponentRecord: "31-66", confidence: 84, probability: 68, time: "8:10 PM", bet: "Astros ML", odds: "-125", edge: "+8.7%", value: "+11%", label: "Strong edge" },
  { team: "New York Yankees", abbr: "NYY", record: "48-35", opponent: "Boston Red Sox", opp: "BOS", opponentRecord: "44-40", confidence: 74, probability: 58, time: "7:05 PM", bet: "Yankees ML", odds: "+102", edge: "+5.6%", value: "+8%", label: "Worth watching" },
  { team: "Minnesota Twins", abbr: "MIN", record: "50-50", opponent: "Cleveland Guardians", opp: "CLE", opponentRecord: "48-48", confidence: 81, probability: 61, time: "7:10 PM", bet: "Twins ML", odds: "+122", edge: "+7.9%", value: "+10%", label: "Value pick" },
  { team: "Atlanta Braves", abbr: "ATL", record: "44-39", opponent: "Miami Marlins", opp: "MIA", opponentRecord: "38-46", confidence: 69, probability: 57, time: "8:05 PM", bet: "Braves ML", odds: "-105", edge: "+4.2%", value: "+6%", label: "Model lean" },
];

export default function MatchupsPage() {
  return (
    <div className="page matchups-page">
      <header className="page-header">
        <div>
          <Badge tone="accent"><Sparkles size={12} /> MATCHUP INTELLIGENCE</Badge>
          <h1>Tonight&apos;s slate, ranked by edge.</h1>
          <p>Compare model confidence, market value, and the recommended side at a glance.</p>
        </div>
        <div className="header-actions">
          <Button variant="secondary"><CalendarDays size={16} /> Today</Button>
          <Button variant="secondary"><SlidersHorizontal size={16} /> Filters</Button>
        </div>
      </header>

      <section className="matchup-summary">
        <Metric label="Games analyzed" value="6" detail="MLB slate" />
        <Metric label="Actionable edges" value="4" detail="Above 7% value" positive />
        <Metric label="Top confidence" value="96%" detail="Seattle ML" positive />
        <div><TrendingUp size={17} /><span>Live intelligence<strong>Updated just now</strong></span></div>
      </section>

      <section className="matchup-grid">
        {games.map((game, index) => (
          <Card className={index === 0 ? "matchup-card featured" : "matchup-card"} key={`${game.abbr}-${game.opp}`}>
            <header>
              <div><span className="rank">#{index + 1}</span><Badge tone={index < 3 ? "success" : "neutral"}>{game.label}</Badge></div>
              <time><Clock3 size={13} /> {game.time}</time>
            </header>
            <div className="matchup-teams">
              <div><span className={`team-logo logo-${game.abbr.toLowerCase()}`}>{game.abbr}</span><strong>{game.team}</strong><small>{game.record}</small></div>
              <div className="versus"><span>VS</span><small>{game.probability}% win</small></div>
              <div><span className={`team-logo logo-${game.opp.toLowerCase()}`}>{game.opp}</span><strong>{game.opponent}</strong><small>{game.opponentRecord}</small></div>
            </div>
            <div className="pick-row">
              <Target size={18} />
              <div><span>STRATIQA PICK</span><strong>{game.bet}</strong></div>
              <b>{game.odds}</b>
            </div>
            <footer>
              <Metric label="Win probability" value={`${game.probability}%`} />
              <Metric label="Model edge" value={game.edge} positive />
              <Metric label="Value" value={game.value} positive />
              <ConfidenceRing value={game.confidence} size="sm" />
            </footer>
            <Link href={`/matchups/${game.abbr.toLowerCase()}-vs-${game.opp.toLowerCase()}`}>
              Open intelligence report <ArrowRight size={16} />
            </Link>
          </Card>
        ))}
      </section>
    </div>
  );
}
