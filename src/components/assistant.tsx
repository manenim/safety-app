"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUp, MessageSquare, ArrowUpRight } from "lucide-react";
import type { AssistantResult, IncidentView } from "@/domain/types";
import {
  ErrorMessage,
  PageHeading,
  post,
  StatusBadge,
  timeAgo,
  useApi,
} from "./ui";
const suggestions = [
  "What happened near Market Junction?",
  "Why is the armed activity claim still unverified?",
  "What changed in the last 30 minutes?",
  "Which signals need more evidence?",
];
export function Assistant() {
  const params = useSearchParams();
  const incidentId = params.get("incidentId") || params.get("incident") || "";
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data } = useApi<{ incidents: IncidentView[]; demoMode: boolean }>(
    "/api/incidents",
  );
  const context = data?.incidents.find((i) => i.id === incidentId);
  async function ask(event?: React.FormEvent, prompt = question) {
    event?.preventDefault();
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setError("");
    setResult(null);
    setAsked(prompt);
    try {
      setResult(
        await post<AssistantResult>("/api/assistant", {
          question: prompt,
          ...(incidentId ? { incidentId } : {}),
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your question could not be answered. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Ask SignalCheck"
        description="Get answers grounded in community reports, with the evidence and uncertainty made clear."
      />
      <div className="assistant-layout">
        <section className="panel assistant-panel">
          {!asked && (
            <div className="assistant-intro">
              <span className="assistant-icon">
                <MessageSquare size={27} />
              </span>
              <h2>Make sense of the signals.</h2>
              <p>
                Ask about a place, an incident, or a claim. Answers reflect the
                reports currently available to SignalCheck.
              </p>
            </div>
          )}
          {context && (
            <div className="context-chip">
              Asking about{" "}
              <Link href={`/incidents/${context.id}`}>{context.title}</Link>
              <Link href="/ask" aria-label="Clear incident context">
                ×
              </Link>
            </div>
          )}
          {!asked && (
            <div className="suggestion-grid">
              {suggestions.map((s) => (
                <button
                  type="button"
                  disabled={busy}
                  key={s}
                  onClick={() => {
                    setQuestion(s);
                    void ask(undefined, s);
                  }}
                >
                  {s}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          )}
          <form onSubmit={ask} className="ask-form">
            <label htmlFor="question">Your question</label>
            <div className="ask-input">
              <textarea
                id="question"
                value={question}
                maxLength={1500}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="What does the evidence say about…"
                required
                disabled={busy}
              />
              <button
                className="button"
                type="submit"
                disabled={busy || !question.trim()}
              >
                <ArrowUp size={18} />
                {busy ? "Checking…" : "Ask"}
              </button>
            </div>
          </form>
          <ErrorMessage message={error} />
          {busy && (
            <div className="assistant-pending" role="status">
              <span className="live-dot" />
              Checking reports and claim evidence…
            </div>
          )}
          {result && (
            <div className="answer" aria-live="polite">
              <p className="question-echo">{asked}</p>
              <div className="section-heading compact">
                <h3>Evidence-based answer</h3>
                <span className="subtle">
                  {result.mode === "ai" ? "AI-assisted" : "Evidence summary"}
                </span>
              </div>
              <div className="generated-content">{result.answer}</div>
              <h3>Referenced evidence</h3>
              {result.citations.length ? (
                <div className="citations">
                  {result.citations.map((c) => (
                    <Link
                      key={c.incidentId}
                      href={`/incidents/${c.incidentId}`}
                    >
                      <div>
                        <strong>{c.title}</strong>
                        <span>Latest report {timeAgo(c.lastReportedAt)}</span>
                      </div>
                      <StatusBadge status={c.status} />
                      <ArrowUpRight size={17} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="subtle">
                  No matching incident references were returned. A lack of
                  reports does not establish that an area is safe.
                </p>
              )}
            </div>
          )}
        </section>
        <aside className="plain-note">
          <h3>Evidence has limits.</h3>
          <p>
            Reports may be incomplete, conflicting, or out of date. Check the
            cited incident to see each claim’s sources and the last update.
          </p>
          <p>
            SignalCheck cannot guarantee safety. For immediate threats, contact
            local emergency services.
          </p>
          <Link className="text-button" href="/">
            Explore the signal feed
            <ArrowUpRight size={16} />
          </Link>
        </aside>
      </div>
    </>
  );
}
