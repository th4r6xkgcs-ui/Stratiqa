"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, MessageCircle, RefreshCw, Send, ShieldCheck, Users } from "lucide-react";

type RoomMessage = { id: string; userId: string; alias: string; body: string; createdAt: string };
type RoomPayload = { messages: RoomMessage[]; currentUserId: string; roomAvailable: boolean };

export function GameRoom({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/game-rooms?eventId=${encodeURIComponent(eventId)}`, { cache: "no-store" });
      const data = await response.json() as RoomPayload & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Game room is temporarily unavailable.");
      setMessages(data.messages ?? []); setCurrentUserId(data.currentUserId ?? ""); setNotice(data.roomAvailable ? "" : "Run the Game Rooms SQL migration to turn on shared chat.");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Game room is temporarily unavailable."); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => { const first = window.setTimeout(() => void load(), 0); const timer = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 10_000); return () => { window.clearTimeout(first); window.clearInterval(timer); }; }, [load]);
  async function send() {
    const body = message.trim(); if (!body || sending) return;
    setSending(true); setNotice("");
    try {
      const response = await fetch("/api/game-rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, eventName, body }) });
      const data = await response.json() as { message?: RoomMessage; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error ?? "Message could not be sent.");
      setMessages((current) => [...current, data.message!].slice(-80)); setMessage("");
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : "Message could not be sent."); }
    finally { setSending(false); }
  }
  async function report(messageId: string) {
    const response = await fetch("/api/game-rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "report", messageId }) });
    setNotice(response.ok ? "Thanks—this message was sent for review." : "That report could not be sent.");
  }
  return <section className="game-room"><header><div><MessageCircle /><span><strong>Game room</strong><small>Shared analysis · updates while this tab is open</small></span></div><span><Users /> {messages.length} recent</span></header><div className="game-room-feed">{loading ? <div className="game-room-loading"><RefreshCw className="spinning" /> Loading room…</div> : messages.length ? messages.map((item) => <article key={item.id} className={item.userId === currentUserId ? "mine" : ""}><span><strong>{item.alias}</strong><small>{new Date(item.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small></span><p>{item.body}</p>{item.userId !== currentUserId ? <button type="button" onClick={() => void report(item.id)} aria-label={`Report message from ${item.alias}`}><Flag /> Report</button> : null}</article>) : <div className="game-room-empty"><MessageCircle /><strong>Start the thoughtful conversation.</strong><small>Discuss the game, the model signals, and what you&apos;re watching—never post personal information or promote live bets.</small></div>}</div><footer><div><ShieldCheck /><span>Community analysis only. No live-bet promotion, abuse, or personal information.</span></div><div className="game-room-compose"><textarea value={message} onChange={(event) => setMessage(event.target.value.slice(0, 400))} placeholder="Share a game observation…" maxLength={400} /><button type="button" disabled={!message.trim() || sending} onClick={() => void send()}><Send /> {sending ? "Sending" : "Send"}</button></div>{notice ? <p>{notice}</p> : null}</footer></section>;
}
