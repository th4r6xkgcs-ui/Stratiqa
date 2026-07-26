import { getMatchupIntelligence, getPropsBoard, getSupportedMatchupSlugs } from "@/services";
import type { IntelligenceAdapter, IntelligenceSnapshot, MarketEdge } from "./types";

export class ServicesIntelligenceAdapter implements IntelligenceAdapter {
  async getSnapshot(): Promise<IntelligenceSnapshot> {
    const [matchups, props] = await Promise.all([
      Promise.all(getSupportedMatchupSlugs().map((slug) => getMatchupIntelligence(slug))),
      getPropsBoard(),
    ]);
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
    const propEdges: MarketEdge[] = props.data.map((prop) => {
      const quote = prop.quotes?.[0];
      const price = quote?.price ?? prop.price;
      return {
        id: `coach:prop:${prop.id}:${quote?.book ?? props.provider}:${quote?.outcomeName ?? prop.line}`,
        matchup: prop.matchup, market: prop.market,
        selection: `${quote?.outcomeName ?? prop.line.split(" ")[0]} ${prop.point ?? prop.line.split(" ")[1]} ${prop.market}`,
        price, modelProbability: prop.hitRate / 100,
        marketProbability: price > 0 ? 100 / (price + 100) : Math.abs(price) / (Math.abs(price) + 100),
        expectedValue: prop.expectedValue / 100, confidence: prop.confidence / 100,
        reasons: [`${prop.hitRate}% recent hit rate`, `${prop.projection} model projection`, ...prop.tags.slice(0, 1)],
        kind: "prop", propId: prop.id, book: quote?.book ?? props.provider,
        outcomeName: quote?.outcomeName ?? prop.line.split(" ")[0], live: Boolean(prop.live),
      };
    });
    return {
      mode: gameEdges.some((edge) => edge.live) || propEdges.some((edge) => edge.live) ? "live" : "mock",
      provider: props.provider,
      generatedAt: new Date().toISOString(),
      edges: [...gameEdges, ...propEdges],
    };
  }
}
