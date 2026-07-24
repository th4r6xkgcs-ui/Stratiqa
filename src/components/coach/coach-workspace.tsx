"use client";

import { FormEvent, useState } from "react";
import { ArrowUp, Bot, CheckCircle2, Database, ShieldCheck, Sparkles } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui/primitives";
import type { CoachReply } from "@/lib/intelligence/types";

const starters = [
  ["slate", "Build my game plan"],
  ["props", "Compare the top props"],
  ["risk", "Show the lowest-risk option"],
] as const;

export function CoachWorkspace() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState<CoachReply | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function ask(question: string, focus = "slate") {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question, focus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "The coach could not answer.");
      setReply(data);
      setMessage("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The coach could not answer.");
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (message.trim()) void ask(message);
  }

  return (
    <div className="coach-layout">
      <Card className="coach-chat">
        <header>
          <span><Bot size={18} /> Coach conversation</span>
          <Badge tone={reply?.snapshot.mode === "live" ? "success" : "warning"}>
            {reply?.snapshot.mode ?? "mock"} data
          </Badge>
        </header>
        <div className="coach-thread" aria-live="polite">
          <div className="coach-message coach-message--assistant">
            <Sparkles size={17} />
            <div><strong>STRATIQA Coach</strong><p>Ask about today&apos;s slate, props, model edge, or risk. I&apos;ll ground the answer in the latest available snapshot.</p></div>
          </div>
          {reply ? (
            <div className="coach-message coach-message--assistant">
              <Sparkles size={17} />
              <div><strong>STRATIQA Coach</strong><p>{reply.answer}</p></div>
            </div>
          ) : null}
          {pending ? <div className="coach-loading"><i /><i /><i /> Analyzing the board…</div> : null}
          {error ? <p className="coach-error" role="alert">{error}</p> : null}
        </div>
        <div className="coach-prompts">
          {(reply?.followUps ?? starters.map(([, label]) => label)).map((label, index) => (
            <button key={label} disabled={pending} onClick={() => void ask(label, starters[index]?.[0] ?? "slate")}>{label}</button>
          ))}
        </div>
        <form className="coach-composer" onSubmit={submit}>
          <label htmlFor="coach-question">Ask the Coach</label>
          <div>
            <textarea id="coach-question" maxLength={500} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="What is the strongest edge and why?" />
            <Button aria-label="Send question" disabled={pending || !message.trim()}><ArrowUp size={17} /></Button>
          </div>
          <small>Decision support only · Verify prices before acting · {message.length}/500</small>
        </form>
      </Card>

      <aside className="coach-context">
        <Card>
          <header><span><Database size={17} /> Data context</span></header>
          <div className="coach-context-body">
            <p><CheckCircle2 /> Adapter boundary active</p>
            <p><ShieldCheck /> Credentials remain server-side</p>
            <small>{reply ? `${reply.snapshot.provider} · refreshed ${new Date(reply.snapshot.generatedAt).toLocaleTimeString()}` : "Representative data is used until a live provider is configured."}</small>
          </div>
        </Card>
        <Card>
          <header><span>How answers are ranked</span></header>
          <ol className="coach-ranking">
            <li><b>1</b><span><strong>Expected value</strong><small>Model probability versus market price</small></span></li>
            <li><b>2</b><span><strong>Confidence</strong><small>Signal quality and agreement</small></span></li>
            <li><b>3</b><span><strong>Risk fit</strong><small>Price limits and uncertainty</small></span></li>
          </ol>
        </Card>
      </aside>
    </div>
  );
}
