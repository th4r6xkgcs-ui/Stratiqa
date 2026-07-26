import "server-only";

export type TicketExtraction = {
  sportsbook: string;
  ticketId: string | null;
  stake: number | null;
  payout: number | null;
  selections: string[];
  event: string | null;
  confidence: number;
};

export async function extractTicket(bytes: Buffer, mimeType: string): Promise<TicketExtraction | null> {
  const endpoint = process.env.STRATIQA_TICKET_OCR_URL;
  const key = process.env.STRATIQA_TICKET_OCR_API_KEY;
  if (!endpoint || !key) return null;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": mimeType, Accept: "application/json" },
    body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Ticket extraction provider responded with ${response.status}`);
  const value = await response.json() as Partial<TicketExtraction>;
  return {
    sportsbook: String(value.sportsbook ?? "").trim().slice(0, 60),
    ticketId: value.ticketId ? String(value.ticketId).trim().slice(0, 120) : null,
    stake: Number.isFinite(Number(value.stake)) && Number(value.stake) >= 0 ? Number(value.stake) : null,
    payout: Number.isFinite(Number(value.payout)) && Number(value.payout) >= 0 ? Number(value.payout) : null,
    selections: Array.isArray(value.selections) ? value.selections.map(String).map((item) => item.trim().slice(0, 180)).filter(Boolean).slice(0, 20) : [],
    event: value.event ? String(value.event).trim().slice(0, 180) : null,
    confidence: Math.max(0, Math.min(100, Number(value.confidence) || 0)),
  };
}
