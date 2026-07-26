import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { CertifiedLeaderboard } from "@/components/rankings/certified-leaderboard";

export default function LeaderboardPage() {
  return <div className="product-page"><header className="product-hero"><div><Badge tone="accent"><Trophy size={11} /> COMPETITIVE RANKINGS</Badge><h1>Earn your place</h1><p>Category and location rankings built from immutable STRATIQA picks with automatic results. No XP, stake advantage, or self-grading.</p></div></header><CertifiedLeaderboard /></div>;
}
