"use client";

import { Component, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, CheckCircle2, ChevronDown, Database, History, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { CoachInsights } from "./coach-insights";
import type { CoachReply } from "@/lib/intelligence/types";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { ProviderHealthPanel } from "@/components/intelligence/provider-health-panel";

const prompts = ["Explain today's top play", "Find another edge", "Safest bet today", "Biggest upset chance", "Best value play", "Show best props"];
type Turn = { id: string; question: string; reply: CoachReply };

function isText(value: unknown): value is string { return typeof value === "string"; }
function isReasoning(value: unknown): value is { title: string; detail: string }[] { return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && isText((item as { title?: unknown }).title) && isText((item as { detail?: unknown }).detail)); }
function isAlternatives(value: unknown): value is CoachReply["alternatives"] { return Array.isArray(value) && value.every((item) => Boolean(item) && typeof item === "object" && isText((item as { selection?: unknown }).selection) && typeof (item as { expectedValue?: unknown }).expectedValue === "number" && typeof (item as { confidence?: unknown }).confidence === "number"); }

class CoachResultBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="coach-error" role="alert"><p>This saved Coach response could not be displayed. Start a new conversation to continue.</p></div> : this.props.children; }
}

function isCoachTurn(value: unknown): value is Turn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Partial<Turn>;
  const reply = turn.reply as Partial<CoachReply> | undefined;
  return isText(turn.id) && isText(turn.question) && isText(reply?.answer) && Boolean(reply.snapshot) && (reply.snapshot?.mode === "live" || reply.snapshot?.mode === "mock") && isText(reply.snapshot?.generatedAt) && typeof reply.confidence?.value === "number" && isText(reply.confidence.explanation) && (reply.risk?.level === "Low" || reply.risk?.level === "Medium" || reply.risk?.level === "High") && isText(reply.risk.explanation) && isReasoning(reply.reasoning) && isAlternatives(reply.alternatives) && Array.isArray(reply.followUps) && reply.followUps.every(isText);
}

export function CoachWorkspace() {
  const [message, setMessage] = useState("");
  const [storedTurns, setTurns] = usePersistentState<Turn[]>("stratiqa.coach.history.v1", []);
  const [streamed, setStreamed] = useState("");
  const [pending, setPending] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const turns = Array.isArray(storedTurns) ? storedTurns.filter(isCoachTurn) : [];
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
      const data = await response.json().catch(() => ({ error: "The Coach returned an unreadable response. Please try again." }));
      if (!response.ok) throw new Error(data.error ?? "The coach could not answer.");
      if (!isCoachTurn({ id: `${data.snapshot?.generatedAt ?? ""}:${question}`, question, reply: data })) throw new Error("The Coach response was incomplete. Please try again.");
      setStreamed("");
      setTurns((current) => [...(Array.isArray(current) ? current.filter(isCoachTurn) : []), { id: `${data.snapshot.generatedAt}:${question}`, question, reply: data }]);
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

  function resetConversation() {
    setTurns([]);
    setStreamed("");
    setError("");
    setHistoryOpen(true);
  }

  return (
    <div className="coach-layout">
      <Card className="coach-chat glass-card">
        <header>
          <span><Bot size={18} /> Coach conversation</span>
          <div><Badge tone={latest?.reply.snapshot.mode === "live" ? "success" : "warning"}>{latest?.reply.snapshot.mode ?? "research"} data</Badge><button className="history-toggle" onClick={() => setHistoryOpen((value) => !value)}><History size={14} /> History <ChevronDown size={13} /></button>{turns.length ? <button className="coach-reset" onClick={resetConversation} aria-label="Start a new Coach conversation"><RotateCcw size={13} /> New</button> : null}</div>
        </header>
        <div className="coach-thread" aria-live="polite">
          <div className="coach-message coach-message--assistant"><Sparkles size={17} /><div><strong>STRATIQA Coach</strong><p>I analyze price, probability, form, injuries, weather, and market behavior together. Ask me where the slate&apos;s best risk-adjusted value sits.</p></div></div>
          {historyOpen ? <CoachResultBoundary>{turns.map((turn, index) => (
            <div className="coach-turn" key={turn.id}>
              <div className="coach-message coach-message--user"><div><strong>You</strong><p>{turn.question}</p></div></div>
              <div className="coach-message coach-message--assistant"><Sparkles size={17} /><div><strong>STRATIQA Coach</strong><p>{index === turns.length - 1 ? streamed : turn.reply.answer}</p>{index === turns.length - 1 && streamed.length < turn.reply.answer.length ? <i className="stream-cursor" /> : null}</div></div>
              {index === turns.length - 1 && streamed.length >= turn.reply.answer.length ? <CoachInsights reply={turn.reply} /> : null}
            </div>
          ))}</CoachResultBoundary> : <button className="history-collapsed" onClick={() => setHistoryOpen(true)}>{turns.length} conversation {turns.length === 1 ? "turn" : "turns"} hidden</button>}
          {pending ? <div className="coach-loading"><i /><i /><i /> Comparing models and markets…</div> : null}
          {error ? <div className="coach-error" role="alert"><p>{error}</p><button type="button" onClick={() => latest ? void ask(latest.question) : void ask("Explain today's top play")}>Try again</button></div> : null}
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
        <ProviderHealthPanel />
        <Card className="glass-card"><header><span><Database size={17} /> Data context</span></header><div className="coach-context-body"><p><CheckCircle2 /> Seven provider services connected</p><p><ShieldCheck /> Credentials remain server-side</p><small>{latest ? `${latest.reply.snapshot.provider} · refreshed ${new Date(latest.reply.snapshot.generatedAt).toLocaleTimeString()}` : "Representative providers are active until live credentials are configured."}</small></div></Card>
        <Card><header><span>How answers are ranked</span></header><ol className="coach-ranking"><li><b>1</b><span><strong>Expected value</strong><small>Model probability versus market price</small></span></li><li><b>2</b><span><strong>Confidence</strong><small>Signal quality and agreement</small></span></li><li><b>3</b><span><strong>Risk fit</strong><small>Price limits and uncertainty</small></span></li></ol></Card>
      </aside>
    </div>
  );
}
