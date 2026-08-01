import { getMatchupIntelligence, getPropsBoard, getSupportedMatchupSlugs } from "@/services";
import type { IntelligenceAdapter, IntelligenceSnapshot, MarketEdge } from "./types";

const fallbackEdges: MarketEdge[] = [
  {
    id: "coach:fallback:research", matchup: "Current slate", market: "Research checklist", selection: "Review the clearest pregame signal",
    price: -110, modelProbability: .55, marketProbability: .524, expectedValue: .026, confidence: .72,
    reasons: ["Compare the available price before locking", "Check lineups and injuries close to game time", "Keep the stake consistent with your plan"],
    kind: "matchup", slug: "sea-vs-sf", book: "STRATIQA research", outcomeName: "Pregame review", live: false,
  },
  {
    id: "coach:fallback:props", matchup: "Props research", market: "Player props", selection: "Validate a player trend before locking",
    price: -110, modelProbability: .54, marketProbability: .524, expectedValue: .016, confidence: .68,
    reasons: ["Use recent role and opportunity", "Check the posted line against your projection", "Avoid forcing action when inputs are incomplete"],
    kind: "prop", propId: "research", book: "STRATIQA research", outcomeName: "Research review", live: false,
  },
];

export class ServicesIntelligenceAdapter implements IntelligenceAdapter {
  async getSnapshot(): Promise<IntelligenceSnapshot> {
    const [matchupsResult, propsResult] = await Promise.allSettled([
      Promise.all(getSupportedMatchupSlugs().map((slug) => getMatchupIntelligence(slug))),
      getPropsBoard(),
    ]);
    const matchups = matchupsResult.status === "fulfilled" ? matchupsResult.value : [];
    const props = propsResult.status === "fulfilled" ? propsResult.value : null;
    const gameEdges: MarketEdge[] = matchups.filter(Boolean).flatMap((matchup) => {
      const quote = matchup!.alternateLines[0];
      if (!quote) return [];
      return [{
        id: `coach:${matchup!.id}:${quote.book}:${quote.line}`, matchup: `${matchup!.away} at ${matchup!.home}`,
        market: quote.marketKey === "h2h" ? "Moneyline" : quote.marketKey === "spreads" ? "Spread" : "Total",
        selection: quote.line, price: quote.price, modelProbability: matchup!.winProbability / 100,
        marketProbability: quote.price > 0 ? 100 / (quote.price + 100) : Math.abs(quote.price) / (Math.abs(quote.price) + 100),
        expectedValue: matchup!.expectedValue / 100, confidence: matchup!.confidence / 100,
        reasons: matchup!.reasoning.slice(0, 3).map((reason) => reason.summary),
        kind: "matchup", slug: matchup!.id, book: quote.book, outcomeName: quote.outcomeName,
        live: matchup!.providerMode === "live",
      }];
    });
    const propEdges: MarketEdge[] = (props?.data ?? []).map((prop) => {
      const quote = prop.quotes?.[0];
      const price = quote?.price ?? prop.price;
      return {
        id: `coach:prop:${prop.id}:${quote?.book ?? props?.provider ?? "research"}:${quote?.outcomeName ?? prop.line}`,
        matchup: prop.matchup, market: prop.market,
        selection: `${quote?.outcomeName ?? prop.line.split(" ")[0]} ${prop.point ?? prop.line.split(" ")[1]} ${prop.market}`,
        price, modelProbability: prop.hitRate / 100,
        marketProbability: price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100),
        expectedValue: prop.expectedValue / 100, confidence: prop.confidence / 100,
        reasons: [`${prop.hitRate}% recent hit rate`, `${prop.projection} model projection`, ...prop.tags.slice(0, 1)],
        kind: "prop", propId: prop.id, book: quote?.book ?? props?.provider ?? "STRATIQA research",
        outcomeName: quote?.outcomeName ?? prop.line.split(" ")[0], live: Boolean(prop.live),
      };
    });
    return {
      mode: gameEdges.some((edge) => edge.live) || propEdges.some((edge) => edge.live) ? "live" : "mock",
      provider: props?.provider ?? "STRATIQA resilient research fallback",
      generatedAt: new Date().toISOString(),
      edges: [...gameEdges, ...propEdges].length ? [...gameEdges, ...propEdges] : fallbackEdges,
    };
  }
}
