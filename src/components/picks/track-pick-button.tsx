"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { addToSlip } from "@/lib/picks/slip";
import type { SportsbookQuote } from "@/services/types";

export function TrackPickButton({ slug, quotes, live, eventName = "Matchup", confidence = 70, expectedValue = 5 }: { slug: string; quotes: SportsbookQuote[]; live: boolean; eventName?: string; confidence?: number; expectedValue?: number }) {
  const quote = quotes[0];
  return <Button className="track-pick-trigger" onClick={() => addToSlip({
    id: `${slug}:${quote.book}:${quote.line}`, slug, selection: quote.line, eventName, book: quote.book,
    price: quote.price, confidence, expectedValue, live, origin: "personal",
  })}><Plus /> Add to slip</Button>;
}
