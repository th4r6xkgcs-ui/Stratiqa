import { getSessionUser } from "@/lib/auth/session";
import { categoryForm, nextCompetitiveGoal } from "@/lib/ratings/competitive-overview.js";
import { seasonalCategoryForm, verifiedAchievements } from "@/lib/ratings/achievements.js";
import { picksRepository } from "@/repositories/picks";

type SnapshotRow = {
  category: string; rating: number; graded_picks: number; global_rank: number | null;
  country_rank: number | null; region_rank: number | null; local_rank: number | null; eligible_count: number;
};

export async function GET() {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
  const [picks, storedRatings] = await Promise.all([picksRepository.list(user.id), picksRepository.listRatings(user.id)]);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let snapshot: SnapshotRow[] = [];
  if (url && key) {
    const response = await fetch(`${url}/rest/v1/rpc/get_user_competitive_snapshot`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requested_user: user.id }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (response.ok) snapshot = await response.json() as SnapshotRow[];
  }
  const byCategory = new Map(snapshot.map((row) => [row.category, row]));
  const categories = storedRatings.map((rating) => {
    const placement = byCategory.get(rating.category);
    return {
      category: rating.category,
      rating: Math.round(rating.rating),
      gradedPicks: rating.gradedPicks,
      globalRank: placement?.global_rank ?? null,
      countryRank: placement?.country_rank ?? null,
      regionRank: placement?.region_rank ?? null,
      localRank: placement?.local_rank ?? null,
      eligibleCount: placement?.eligible_count ?? 0,
      form: categoryForm(picks, rating.category),
    };
  }).sort((a, b) => b.rating - a.rating);
  const settledPicks = picks.filter((pick) => pick.source === "provider" && ["win", "loss", "push"].includes(pick.result));
  return Response.json({
    categories,
    goal: nextCompetitiveGoal(categories),
    settledPicks: settledPicks.length,
    season: seasonalCategoryForm(settledPicks),
    achievements: verifiedAchievements({ categories, settledPicks: settledPicks.length }),
  });
}
