import "server-only";
import { getIntelligenceSnapshot } from "@/lib/intelligence";
import type { CoachPrompt, CoachReply, MarketEdge } from "@/lib/intelligence/types";

const percent = (value: number) => `${Math.round(value * 100)}%`;
const signedPercent = (value: number) => `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;

function chooseEdge(edges: MarketEdge[], focus: CoachPrompt["focus"]) {
  if (focus === "props") return edges.find((edge) => edge.market !== "Moneyline") ?? edges[0];
  if (focus === "risk") return [...edges].sort((a, b) => b.confidence - a.confidence)[0];
  return [...edges].sort((a, b) => b.expectedValue - a.expectedValue)[0];
}

function inferFocus(message: string, fallback: CoachPrompt["focus"]) {
  const normalized = message.toLowerCase();
  if (normalized.includes("prop")) return "props";
  if (normalized.includes("safe") || normalized.includes("risk")) return "risk";
  return fallback;
}

export async function answerCoach(prompt: CoachPrompt): Promise<CoachReply> {
  const snapshot = await getIntelligenceSnapshot();
  const edge = chooseEdge(snapshot.edges, inferFocus(prompt.message, prompt.focus));

  const answer = edge
    ? `${edge.selection} is the clearest fit for this request. The model estimates ${percent(edge.modelProbability)} probability and ${signedPercent(edge.expectedValue)} expected value at ${edge.price > 0 ? "+" : ""}${edge.price}. The case is driven by ${edge.reasons.join(", ").toLowerCase()}. Treat this as decision support, confirm the current price, and size within your limits.`
    : "No qualified edge is available in the current snapshot. Avoid forcing a position and check again after the next data refresh.";

  return {
    answer,
    confidence: {
      value: Math.round((edge?.confidence ?? 0) * 100),
      explanation: edge ? `Signal agreement is strong across ${edge.reasons.length} independent factors, with market price still inside the model's playable range.` : "No qualified signal is available.",
    },
    risk: {
      level: (edge?.confidence ?? 0) >= .86 ? "Low" : (edge?.confidence ?? 0) >= .75 ? "Medium" : "High",
      explanation: edge ? "Primary risks are late lineup changes, price deterioration, and normal single-game variance. Recheck the market before acting." : "Avoid forcing a position.",
    },
    reasoning: edge?.reasons.map((reason, index) => ({ title: `Signal ${index + 1}`, detail: reason })) ?? [],
    alternatives: snapshot.edges.filter((item) => item.id !== edge?.id).slice(0, 2).map((item) => ({ selection: item.selection, expectedValue: item.expectedValue, confidence: item.confidence })),
    followUps: ["Explain today's top play", "Find another edge", "Safest bet today", "Biggest upset chance", "Best value play", "Show best props"],
    snapshot, recommendation: edge,
  };
}

export function fallbackCoachReply(prompt: CoachPrompt): CoachReply {
  const focus = inferFocus(prompt.message, prompt.focus);
  const selection = focus === "props" ? "Review a player prop only after checking role and the posted pregame line" : focus === "risk" ? "Wait for a clean pregame price that fits your risk plan" : "Compare the strongest available pregame signal before locking";
  const edge: MarketEdge = {
    id: "coach:recovery:research", matchup: "Current research board", market: focus === "props" ? "Player props" : "Pregame research", selection,
    price: -110, modelProbability: .54, marketProbability: .524, expectedValue: .016, confidence: .68,
    reasons: ["The live research service is refreshing", "Current price and availability should be confirmed before a lock", "A patient pass is better than forcing a decision"], kind: focus === "props" ? "prop" : "matchup", live: false,
  };
  return {
    answer: `The live research feed is refreshing, so I am not presenting a specific market as current. Start with this checklist: ${edge.reasons.join(", ").toLowerCase()}. You can still use the Game Finder, Props Lab, and your own model notes to prepare a pregame decision.`,
    confidence: { value: 68, explanation: "This is a cautious research fallback, not a live-market confidence score." },
    risk: { level: "High", explanation: "Do not treat a fallback research response as a current price or recommendation." },
    reasoning: edge.reasons.map((detail, index) => ({ title: `Research step ${index + 1}`, detail })),
    alternatives: [], followUps: ["Explain today's top play", "Find another edge", "Safest bet today", "Show best props"],
    snapshot: { mode: "mock", provider: "STRATIQA Coach recovery mode", generatedAt: new Date().toISOString(), edges: [edge] }, recommendation: edge,
  };
}
