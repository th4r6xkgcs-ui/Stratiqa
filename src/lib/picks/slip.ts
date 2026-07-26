export type SlipLeg = {
  id: string; slug?: string; selection: string; eventName: string; book: string; price: number;
  confidence: number; expectedValue: number; live: boolean; modelName?: string | null;
  kind?: "matchup" | "prop"; propId?: string; outcomeName?: string;
};

export const slipEvent = "stratiqa:add-slip-leg";
export function addToSlip(leg: SlipLeg) {
  window.dispatchEvent(new CustomEvent<SlipLeg>(slipEvent, { detail: leg }));
}
