import Image from "next/image";
import { Activity, Crown, ShieldCheck, Star, Target, TrendingUp, Trophy } from "lucide-react";
import { Badge, Card, Metric } from "@/components/ui/primitives";

export default async function AnalystProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const name = slug === "heriberto" ? "Heriberto" : slug.replaceAll("-", " ");
  return (
    <div className="product-page analyst-page">
      <Card className="analyst-hero">
        <div className="analyst-image"><Image src="/analyst-heriberto.png" alt={name} width={220} height={260} priority /></div>
        <div><Badge tone="accent"><Crown size={12} /> Elite Analyst</Badge><h1>{name} <b>✓</b></h1><p>Founding member · MLB model specialist · Top 2% of all verified analysts</p><div className="analyst-tags"><span><ShieldCheck size={13} /> Verified record</span><span><Star size={13} /> 18 day streak</span></div></div>
        <div className="analyst-rating"><strong>2724</strong><span>GLOBAL RATING</span><b>#47</b><small>▲ 31 this month</small></div>
      </Card>
      <section className="product-metrics analyst-metrics">
        <Card><Metric value="63.8%" label="Win rate" detail="412 verified picks" /></Card>
        <Card><Metric value="+124.1" label="Units profit" detail="12.4% ROI" positive /></Card>
        <Card><Metric value="98" label="Confidence score" detail="Top 1%" /></Card>
        <Card><Metric value="18" label="Day streak" detail="Best: 21" /></Card>
      </section>
      <div className="analyst-content">
        <Card className="data-panel">
          <header><span><Target size={16} /> Recent verified picks</span><Badge tone="success">LIVE RECORD</Badge></header>
          <div className="profile-picks">
            <div><span><strong>Seattle Mariners ML</strong><small>SEA vs SF · 7:10 PM</small></span><b>Won</b><em>+1.00u</em></div>
            <div><span><strong>Julio Rodríguez O1.5 TB</strong><small>SEA vs SF · Player prop</small></span><b>Won</b><em>+0.85u</em></div>
            <div><span><strong>Minnesota Twins ML</strong><small>MIN vs CLE · 7:10 PM</small></span><i>Lost</i><u>-1.00u</u></div>
          </div>
        </Card>
        <Card className="insight-card">
          <header><span><TrendingUp size={16} /> Performance profile</span></header>
          <div><h2>Consistent edge, controlled risk.</h2><p>Heriberto ranks strongest in MLB moneylines and pitcher props, with positive closing-line value in six consecutive weeks.</p><div className="profile-strengths"><span><Trophy size={14} /> MLB Moneylines <b>91</b></span><span><Activity size={14} /> Player Props <b>87</b></span></div></div>
        </Card>
      </div>
    </div>
  );
}
