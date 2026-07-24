import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, BookOpen, BrainCircuit, CloudSun, Cross, Sparkles, TrendingUp, Users } from "lucide-react";
import { ConfidenceRing } from "@/components/ui/confidence-ring";
import { Badge, Card } from "@/components/ui/primitives";
import { ReasoningCard } from "@/components/intelligence/reasoning-card";
import { StatMeter } from "@/components/intelligence/stat-meter";
import { getMatchupIntelligence, getSupportedMatchupSlugs } from "@/services";

export function generateStaticParams() {
  return getSupportedMatchupSlugs().map((slug) => ({ slug }));
}

export default async function MatchupDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const matchup = await getMatchupIntelligence(slug);
  if (!matchup) notFound();

  return (
    <div className="page intelligence-report">
      <Link className="back-link" href="/matchups"><ArrowLeft size={16} /> Back to matchups</Link>
      <Card className="intelligence-hero glass-card">
        <div>
          <Badge tone="accent"><Sparkles size={11} /> AI MATCHUP INTELLIGENCE</Badge>
          <p>{matchup.startTime} · {matchup.bestSportsbook} best price</p>
          <h1>{matchup.awayAbbr} <span>vs</span> {matchup.homeAbbr}</h1>
          <h2>{matchup.pick}</h2>
          <p className="ai-summary">{matchup.aiSummary}</p>
        </div>
        <div className="intelligence-grade"><ConfidenceRing value={matchup.confidence} size="lg" label="Confidence" /><span>VALUE GRADE<strong>{matchup.valueGrade}</strong></span></div>
      </Card>

      <section className="intelligence-stats">
        <StatMeter label="Win probability" value={`${matchup.winProbability}%`} detail="Model projection" />
        <StatMeter label="Model edge" value={`+${matchup.modelEdge}%`} detail="vs market" tone="purple" />
        <StatMeter label="Expected value" value={`+${matchup.expectedValue}%`} detail="At current price" tone="blue" />
        <StatMeter label="Sharp / public" value={`${matchup.market.sharpPercent}% / ${matchup.market.ticketPercent}%`} detail="Professional vs tickets" tone="orange" />
      </section>

      <div className="intelligence-columns">
        <section className="intelligence-main">
          <Card className="market-intelligence">
            <header><span><TrendingUp size={17} /> Market intelligence</span><Badge tone="success">Live-ready</Badge></header>
            <div className="split-grid">
              <StatMeter label="Money %" value={`${matchup.market.moneyPercent}%`} detail="Handle share" />
              <StatMeter label="Ticket %" value={`${matchup.market.ticketPercent}%`} detail="Bet share" tone="purple" />
              <StatMeter label="Line movement" value={`${matchup.market.open > 0 ? "+" : ""}${matchup.market.open} → ${matchup.market.current > 0 ? "+" : ""}${matchup.market.current}`} detail="Open to current" tone="blue" />
            </div>
            <div className="line-chart" aria-label="Illustrative line movement chart"><i /><i /><i /><i /><i /><i /><i /></div>
          </Card>
          <Card className="reasoning-panel">
            <header><span><BrainCircuit size={17} /> Why the model likes it</span></header>
            {matchup.reasoning.map((reason) => <ReasoningCard key={reason.title} {...reason} />)}
          </Card>
        </section>

        <aside className="intelligence-rail">
          <Card>
            <header><span><Activity size={16} /> Edge profile</span></header>
            <div className="factor-list">
              <span><Cross size={14} /> Injury impact <b>{matchup.injuryImpact}</b></span>
              <span><CloudSun size={14} /> Weather impact <b>{matchup.weatherImpact >= 0 ? "+" : ""}{matchup.weatherImpact}%</b></span>
              <span><Users size={14} /> Bullpen edge <b>+{matchup.bullpenEdge}%</b></span>
              <span><Activity size={14} /> Starting pitching <b>+{matchup.startingPitchingEdge}%</b></span>
              <span><TrendingUp size={14} /> Recent form <b>{matchup.recentForm}</b></span>
            </div>
          </Card>
          <Card>
            <header><span><BookOpen size={16} /> Best lines</span></header>
            <div className="sportsbook-list">{matchup.alternateLines.map((quote, index) => <div key={quote.book}><span><strong>{quote.book}</strong><small>{quote.line}</small></span><b>{quote.price > 0 ? "+" : ""}{quote.price}</b>{index === 0 ? <em>BEST</em> : null}</div>)}</div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
