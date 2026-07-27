import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { CertifiedLeaderboard } from "@/components/rankings/certified-leaderboard";
import { CompetitiveOverview } from "@/components/rankings/competitive-overview";

export default function LeaderboardPage() {
  return <div className="product-page leaderboard-page"><header className="product-hero"><div><Badge tone="accent"><Trophy size={11} /> COMPETITIVE RANKINGS</Badge><h1>Build your rating. Own your category.</h1><p>Climb global and local rankings with automatically settled picks. Every category has its own board, so specialists get the recognition they earn.</p></div></header><CompetitiveOverview /><CertifiedLeaderboard /></div>;
}
