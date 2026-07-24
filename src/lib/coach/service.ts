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

export async function answerCoach(prompt: CoachPrompt): Promise<CoachReply> {
  const snapshot = await getIntelligenceSnapshot();
  const edge = chooseEdge(snapshot.edges, prompt.focus);

  const answer = edge
    ? `${edge.selection} is the clearest fit for this request. The model estimates ${percent(edge.modelProbability)} probability and ${signedPercent(edge.expectedValue)} expected value at ${edge.price > 0 ? "+" : ""}${edge.price}. The case is driven by ${edge.reasons.join(", ").toLowerCase()}. Treat this as decision support, confirm the current price, and size within your limits.`
    : "No qualified edge is available in the current snapshot. Avoid forcing a position and check again after the next data refresh.";

  return {
    answer,
    followUps: ["Explain the model edge", "Compare the top props", "Show the lowest-risk option"],
    snapshot,
  };
}
