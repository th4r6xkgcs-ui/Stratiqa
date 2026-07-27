import { CalendarDays, Sparkles, TrendingUp } from "lucide-react";
import { MatchupWorkspace } from "@/components/matchups/matchup-workspace";
import { matchupCatalog } from "@/lib/matchups/catalog";
import { Badge, Button, Metric } from "@/components/ui/primitives";

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
        </div>
      </header>

      <section className="matchup-summary">
        <Metric label="Games analyzed" value="6" detail="MLB slate" />
        <Metric label="Actionable edges" value="4" detail="Above 7% value" positive />
        <Metric label="Top confidence" value="96%" detail="Seattle ML" positive />
        <div><TrendingUp size={17} /><span>Live intelligence<strong>Updated just now</strong></span></div>
      </section>

      <MatchupWorkspace matchups={matchupCatalog} />
    </div>
  );
}
