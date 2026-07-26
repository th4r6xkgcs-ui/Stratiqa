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
