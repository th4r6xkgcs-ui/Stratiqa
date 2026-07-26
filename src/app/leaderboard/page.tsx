import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { CertifiedLeaderboard } from "@/components/rankings/certified-leaderboard";

export default function LeaderboardPage() {
  return <div className="product-page"><header className="product-hero"><div><Badge tone="accent"><Trophy size={11} /> CERTIFIED RANKINGS</Badge><h1>Earn your place</h1><p>Location and category rankings built only from independently certified sportsbook picks. No XP, stake advantage, or self-reported results.</p></div></header><CertifiedLeaderboard /></div>;
}
