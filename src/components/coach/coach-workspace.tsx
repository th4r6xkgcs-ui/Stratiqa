"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, CheckCircle2, ChevronDown, Database, History, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { CoachInsights } from "./coach-insights";
import type { CoachReply } from "@/lib/intelligence/types";

const prompts = ["Explain today's top play", "Find another edge", "Safest bet today", "Biggest upset chance", "Best value play", "Show best props"];
type Turn = { id: number; question: string; reply: CoachReply };

export function CoachWorkspace() {
  const [message, setMessage] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [streamed, setStreamed] = useState("");
  const [pending, setPending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const latest = turns.at(-1);

  useEffect(() => {
    if (!latest) return;
    let index = 0;
    const timer = window.setInterval(() => {
      index += 3;
      setStreamed(latest.reply.answer.slice(0, index));
      if (index >= latest.reply.answer.length) window.clearInterval(timer);
    }, 14);
    return () => window.clearInterval(timer);
  }, [latest]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), [streamed, pending]);

  async function ask(question: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: question, focus: "slate" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The coach could not answer.");
      setStreamed("");
      setTurns((current) => [...current, { id: Date.now(), question, reply: data }]);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The coach could not answer.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (message.trim()) void ask(message.trim());
  }

  return (
    <div className="coach-layout">
      <Card className="coach-chat glass-card">
        <header>
          <span><Bot size={18} /> Coach conversation</span>
          <div><Badge tone={latest?.reply.snapshot.mode === "live" ? "success" : "warning"}>{latest?.reply.snapshot.mode ?? "mock"} data</Badge><button className="history-toggle" onClick={() => setHistoryOpen((value) => !value)}><History size={14} /> History <ChevronDown size={13} /></button></div>
        </header>
        <div className="coach-thread" aria-live="polite">
          <div className="coach-message coach-message--assistant"><Sparkles size={17} /><div><strong>STRATIQA Coach</strong><p>I analyze price, probability, form, injuries, weather, and market behavior together. Ask me where the slate&apos;s best risk-adjusted value sits.</p></div></div>
          {historyOpen ? turns.map((turn, index) => (
            <div className="coach-turn" key={turn.id}>
              <div className="coach-message coach-message--user"><div><strong>You</strong><p>{turn.question}</p></div></div>
              <div className="coach-message coach-message--assistant"><Sparkles size={17} /><div><strong>STRATIQA Coach</strong><p>{index === turns.length - 1 ? streamed : turn.reply.answer}</p>{index === turns.length - 1 && streamed.length < turn.reply.answer.length ? <i className="stream-cursor" /> : null}</div></div>
              {index === turns.length - 1 && streamed.length >= turn.reply.answer.length ? <CoachInsights reply={turn.reply} /> : null}
            </div>
          )) : <button className="history-collapsed" onClick={() => setHistoryOpen(true)}>{turns.length} conversation {turns.length === 1 ? "turn" : "turns"} hidden</button>}
          {pending ? <div className="coach-loading"><i /><i /><i /> Comparing models and markets…</div> : null}
          {error ? <p className="coach-error" role="alert">{error}</p> : null}
          <div ref={bottomRef} />
        </div>
        <div className="coach-prompts">{prompts.map((label) => <button key={label} disabled={pending} onClick={() => void ask(label)}>{label}</button>)}</div>
        <form className="coach-composer" onSubmit={submit}>
          <label htmlFor="coach-question">Ask the Coach</label>
          <div><textarea id="coach-question" maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What is the strongest edge and why?" /><Button aria-label="Send question" disabled={pending || !message.trim()}><ArrowUp size={17} /></Button></div>
          <small>Decision support only · Verify prices before acting · {message.length}/500</small>
        </form>
      </Card>
      <aside className="coach-context">
        <Card className="glass-card"><header><span><Database size={17} /> Data context</span></header><div className="coach-context-body"><p><CheckCircle2 /> Seven provider services connected</p><p><ShieldCheck /> Credentials remain server-side</p><small>{latest ? `${latest.reply.snapshot.provider} · refreshed ${new Date(latest.reply.snapshot.generatedAt).toLocaleTimeString()}` : "Representative providers are active until live credentials are configured."}</small></div></Card>
        <Card><header><span>How answers are ranked</span></header><ol className="coach-ranking"><li><b>1</b><span><strong>Expected value</strong><small>Model probability versus market price</small></span></li><li><b>2</b><span><strong>Confidence</strong><small>Signal quality and agreement</small></span></li><li><b>3</b><span><strong>Risk fit</strong><small>Price limits and uncertainty</small></span></li></ol></Card>
      </aside>
    </div>
  );
}
