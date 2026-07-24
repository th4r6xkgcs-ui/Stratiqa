import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/primitives";

export default async function MatchupDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <div className="page">
      <Link className="back-link" href="/matchups"><ArrowLeft size={16} /> Back to matchups</Link>
      <Card className="detail-card">
        <span className="eyebrow">INTELLIGENCE REPORT</span>
        <h1>{slug.replaceAll("-", " ").toUpperCase()}</h1>
        <p>The full matchup model remains connected to this route. Detailed pitching, bullpen, injury, weather, and market modules can be populated from the live data layer.</p>
      </Card>
    </div>
  );
}
