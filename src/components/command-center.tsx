"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ClipboardList,
} from "lucide-react";
import type {
  Dashboard,
  GeneratedAlert,
  VerificationRequest,
  Report,
} from "@/domain/types";
import { statuses } from "@/domain/types";
import {
  api,
  dateTime,
  CopyDownload,
  Empty,
  ErrorMessage,
  IncidentCard,
  label,
  Loading,
  PageHeading,
  post,
  StatusBadge,
  timeAgo,
  useApi,
} from "./ui";
export function CommandCenter() {
  const params = useSearchParams();
  const { data, error, loading, reload } = useApi<Dashboard>("/api/dashboard");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [selected, setSelected] = useState(params.get("incidentId") || "");
  const [windowMinutes, setWindowMinutes] = useState("30");
  const [brief, setBrief] = useState("");
  const [changes, setChanges] = useState("");
  const [request, setRequest] = useState("");
  const [alert, setAlert] = useState<GeneratedAlert | null>(null);
  const [actionBusy, setActionBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const [view, setView] = useState(
    params.get("incidentId") ? "tools" : "updates",
  );
  const [coordinatorTab, setCoordinatorTab] = useState<
    "workspace" | "verify" | "alert"
  >("workspace");
  async function authenticate(demo = false) {
    setAuthBusy(true);
    setAuthError("");
    try {
      await post(
        "/api/coordinator/login",
        demo ? { demo: true } : { password },
      );
      setPassword("");
      await reload();
      setView("tools");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }
  async function logout() {
    setAuthBusy(true);
    setAuthError("");
    try {
      await post("/api/coordinator/logout", {});
      setBrief("");
      setChanges("");
      setRequest("");
      setAlert(null);
      await reload();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-out failed.");
    } finally {
      setAuthBusy(false);
    }
  }
  async function generate(kind: "brief" | "changes" | "verify") {
    setActionBusy(kind);
    setActionError("");
    try {
      if (kind === "verify") {
        if (!selected)
          throw new Error("Select an incident to request verification.");
        const result = await post<{ request: VerificationRequest }>(
          `/api/incidents/${selected}/verify`,
          {},
        );
        setRequest(result.request.content);
      } else {
        const result = await post<{ content: string }>(
          kind === "brief" ? "/api/situation-brief" : "/api/what-changed",
          {
            windowMinutes: Number(windowMinutes),
            ...(kind === "brief" && selected ? { incidentId: selected } : {}),
          },
        );
        if (kind === "brief") setBrief(result.content);
        else setChanges(result.content);
      }
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Generation failed. Please retry.",
      );
    } finally {
      setActionBusy("");
    }
  }
  async function generateAlert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionBusy("alert");
    setActionError("");
    setAlert(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await post<{ alert: GeneratedAlert }>(
        "/api/alerts/generate",
        {
          incidentId: selected,
          format: form.get("format"),
          language: form.get("language"),
          audience: form.get("audience"),
          length: form.get("length"),
        },
      );
      setAlert(result.alert);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Alert generation failed.",
      );
    } finally {
      setActionBusy("");
    }
  }
  if (loading && !data) return <Loading text="Loading command center…" />;
  if (!data)
    return (
      <ErrorMessage
        message={error || "The command center is unavailable."}
        retry={reload}
      />
    );
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  const list = data.incidents
    .filter(
      (i) =>
        (!filter || i.status === filter) &&
        (!search ||
          `${i.title} ${i.location.normalizedLabel || ""}`
            .toLowerCase()
            .includes(search.toLowerCase())),
    )
    .sort((a, b) =>
      sort === "severity"
        ? severityOrder[b.severity] - severityOrder[a.severity]
        : sort === "sources"
          ? b.independentSourceCount - a.independentSourceCount
          : Date.parse(b.lastReportedAt) - Date.parse(a.lastReportedAt),
    );
  const incident = data.incidents.find((i) => i.id === selected);
  const emerging = data.incidents.filter((i) => i.status === "emerging");
  return (
    <>
      <PageHeading
        title="Coordinator"
        description="Follow the evidence. Help your community stay informed."
        action={
          data.coordinator ? (
            <button
              className="button secondary"
              disabled={authBusy}
              onClick={logout}
            >
              <LogOut size={16} />
              Sign out
            </button>
          ) : (
            <span className="access-label">
              <LockKeyhole size={16} />
              Public overview
            </span>
          )
        }
      />
      <ErrorMessage message={error} retry={reload} />
      <ErrorMessage message={authError} />
      <div className="coordinator-tabs" aria-label="Coordinator views">
        {[
          ["updates", "Community updates"],
          ["tools", "Your tools"],
          ["activity", "Activity"],
        ].map(([id, title]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            aria-pressed={view === id}
            onClick={() => setView(id)}
          >
            {title}
          </button>
        ))}
      </div>
      <details className="metrics-disclosure">
        <summary>
          Community at a glance · {data.metrics.active} active incidents
        </summary>
        <div className="metrics-grid">
          {(
            [
              ["active", "Active incidents"],
              ["corroborated", "Corroborated"],
              ["emerging", "Emerging signals"],
              ["conflicting", "Conflicting"],
              ["highSeverity", "High / critical"],
              ["reportsLastHour", "Reports last hour"],
              ["stale", "Stale signals"],
            ] as const
          ).map(([key, title]) => (
            <div key={key} className={`metric metric-${key}`}>
              <span>{title}</span>
              <strong>{data.metrics[key]}</strong>
            </div>
          ))}
        </div>
      </details>
      {!data.coordinator && (
        <section className="panel login-panel">
          <div>
            <h2>
              <LockKeyhole size={20} />
              Coordinator access
            </h2>
            <p>
              Sign in to generate situation briefs, draft alerts, and prepare
              verification requests.
            </p>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void authenticate();
            }}
          >
            <label className="sr-only" htmlFor="password">
              Coordinator password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Coordinator password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={authBusy}
            />
            <button className="button" disabled={authBusy} type="submit">
              {authBusy ? "Signing in…" : "Sign in"}
            </button>
            {data.demoMode && (
              <button
                className="button secondary"
                disabled={authBusy}
                type="button"
                onClick={() => void authenticate(true)}
              >
                Open coordinator workspace
              </button>
            )}
          </form>
        </section>
      )}
      {view === "updates" && (
        <section className="panel intelligence-panel">
          <div className="section-heading compact">
            <h2>
              <Activity size={20} />
              Community updates
            </h2>
            <button className="text-button" onClick={reload} disabled={loading}>
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
          <div className="table-filters">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Search incident intelligence"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search incidents or locations"
              />
            </label>
            <label>
              Status
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort by
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="latest">Latest report</option>
                <option value="severity">Highest severity</option>
                <option value="sources">Most sources</option>
              </select>
            </label>
          </div>
          <div className="coordinator-posts">
            {list.map((i) => (
              <IncidentCard key={i.id} incident={i} />
            ))}
          </div>
          {!list.length && <Empty />}
        </section>
      )}
      <div className="command-layout">
        {view === "activity" && (
          <section>
            <div className="section-heading">
              <h2>Emerging signals</h2>
              <span className="count">{emerging.length}</span>
            </div>
            {emerging.length ? (
              emerging.map((i) => <IncidentCard key={i.id} incident={i} />)
            ) : (
              <div className="panel">
                <p className="subtle">
                  No emerging signals at the moment. New reports may change the
                  picture.
                </p>
              </div>
            )}
            <section className="panel">
              <h2>Recent evidence activity</h2>
              <ol className="timeline">
                {data.incidents
                  .flatMap((i) =>
                    i.timeline.map((event) => ({
                      ...event,
                      title: i.title,
                      incidentId: i.id,
                    })),
                  )
                  .sort(
                    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
                  )
                  .slice(0, 6)
                  .map((event) => (
                    <li key={event.id}>
                      <time dateTime={event.createdAt}>
                        {timeAgo(event.createdAt)}
                      </time>
                      <Link href={`/incidents/${event.incidentId}`}>
                        {event.title}
                      </Link>
                      <div>
                        <StatusBadge status={event.newStatus} />
                      </div>
                      <p>{event.reason[0]}</p>
                    </li>
                  ))}
              </ol>
            </section>
          </section>
        )}
        {view === "tools" && (
          <div className="stack">
            {data.coordinator ? (
              <section className="panel">
                <div className="tool-tabs flex gap-6 border-b border-line mb-6 overflow-x-auto whitespace-nowrap">
                  {(
                    [
                      ["workspace", "Briefs", ClipboardList],
                      ["verify", "Verification", Search],
                      ["alert", "Alert Drafts", Activity],
                    ] as const
                  ).map(([id, title, Icon]) => (
                    <button
                      key={id}
                      onClick={() => setCoordinatorTab(id)}
                      aria-pressed={coordinatorTab === id}
                      className={`pb-3 text-[15px] font-medium transition-colors border-b-2 flex items-center gap-2 ${
                        coordinatorTab === id
                          ? "border-teal text-ink font-semibold"
                          : "border-transparent text-muted hover:text-ink"
                      }`}
                    >
                      <Icon size={16} />
                      {title}
                    </button>
                  ))}
                </div>

                <ErrorMessage message={actionError} />
                {coordinatorTab === "workspace" && (
                  <div className="form-fields coordinator-scope">
                    <label>
                      Incident focus
                      <select
                        value={selected}
                        onChange={(e) => {
                          setSelected(e.target.value);
                          setRequest("");
                          setAlert(null);
                          setBrief("");
                        }}
                      >
                        <option value="">All incidents (briefs only)</option>
                        {data.incidents.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    {incident && (
                      <div className="inset">
                        <StatusBadge status={incident.status} />
                        <p>
                          <strong>Next verification step</strong>
                        </p>
                        <p>{incident.verificationRecommendation}</p>
                      </div>
                    )}
                    {selected && (
                      <InternalReports key={selected} incidentId={selected} />
                    )}
                    <label>
                      Briefing window
                      <select
                        value={windowMinutes}
                        onChange={(e) => setWindowMinutes(e.target.value)}
                      >
                        <option value="30">Last 30 minutes</option>
                        <option value="60">Last hour</option>
                        <option value="1440">Last 24 hours</option>
                      </select>
                    </label>
                    <div className="row wrap">
                      <button
                        className="button"
                        disabled={!!actionBusy}
                        onClick={() => void generate("brief")}
                      >
                        {actionBusy === "brief"
                          ? "Preparing brief…"
                          : "Generate situation brief"}
                      </button>
                      <button
                        className="button secondary"
                        disabled={!!actionBusy}
                        onClick={() => void generate("changes")}
                      >
                        {actionBusy === "changes"
                          ? "Checking changes…"
                          : "What changed?"}
                      </button>
                    </div>
                    {brief && (
                      <div className="generated-output" aria-live="polite">
                        <h3>Situation brief</h3>
                        <div className="generated-content">{brief}</div>
                        <CopyDownload
                          content={brief}
                          name="signalcheck-situation-brief"
                        />
                      </div>
                    )}
                    {changes && (
                      <div className="generated-output" aria-live="polite">
                        <h3>What changed?</h3>
                        <div className="generated-content">{changes}</div>
                        <CopyDownload
                          content={changes}
                          name="signalcheck-changes"
                        />
                      </div>
                    )}
                  </div>
                )}

                {coordinatorTab === "verify" && (
                  <div className="form-fields">
                    <p className="subtle">
                      Draft a specific request for the evidence this incident
                      still needs. Nothing is sent automatically.
                    </p>
                    <label>
                      Target incident
                      <select
                        value={selected}
                        onChange={(e) => {
                          setSelected(e.target.value);
                          setRequest("");
                          setAlert(null);
                          setBrief("");
                        }}
                      >
                        <option value="">Select an incident...</option>
                        {data.incidents.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="button secondary"
                      disabled={!selected || !!actionBusy}
                      onClick={() => void generate("verify")}
                    >
                      {actionBusy === "verify"
                        ? "Preparing request…"
                        : "Create verification request"}
                    </button>
                    {!selected && (
                      <p className="field-help">
                        Select an incident to prepare a verification request.
                      </p>
                    )}
                    {request && (
                      <div className="generated-output mt-4" aria-live="polite">
                        <div className="generated-content">{request}</div>
                        <CopyDownload
                          content={request}
                          name="signalcheck-verification"
                        />
                      </div>
                    )}
                  </div>
                )}

                {coordinatorTab === "alert" && (
                  <div>
                    <p className="section-intro">
                      Create an update that preserves what is known and what
                      remains unverified. Review before sharing.
                    </p>
                    <form className="form-fields" onSubmit={generateAlert}>
                      <label>
                        Target incident
                        <select
                          value={selected}
                          onChange={(e) => {
                            setSelected(e.target.value);
                            setRequest("");
                            setAlert(null);
                            setBrief("");
                          }}
                        >
                          <option value="">Select an incident...</option>
                          {data.incidents.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="form-row">
                        <label>
                          Format
                          <select name="format">
                            <option value="short">Short alert</option>
                            <option value="sms">SMS-style alert</option>
                            <option value="whatsapp">
                              WhatsApp-style message
                            </option>
                            <option value="radio">Radio announcement</option>
                            <option value="push">Push notification</option>
                            <option value="briefing">Community briefing</option>
                          </select>
                        </label>
                        <label>
                          Language
                          <select name="language">
                            <option>English</option>
                            <option>Pidgin</option>
                            <option>Hausa</option>
                            <option>Yoruba</option>
                            <option>Igbo</option>
                          </select>
                        </label>
                      </div>
                      <div className="form-row">
                        <label>
                          Audience
                          <input
                            name="audience"
                            defaultValue="Residents"
                            required
                            maxLength={150}
                          />
                        </label>
                        <label>
                          Length
                          <select name="length">
                            <option value="brief">Brief</option>
                            <option value="standard">Standard</option>
                            <option value="detailed">Detailed</option>
                          </select>
                        </label>
                      </div>
                      <button
                        className="button"
                        disabled={!selected || !!actionBusy}
                      >
                        {actionBusy === "alert"
                          ? "Drafting alert…"
                          : "Generate alert"}
                      </button>
                      {!selected && (
                        <p className="field-help">
                          Select an incident to draft an alert.
                        </p>
                      )}
                    </form>
                    {alert && (
                      <div className="generated-output mt-4" aria-live="polite">
                        <div className="row between">
                          <h3>Alert draft</h3>
                          <span className="subtle">{alert.language}</span>
                        </div>
                        <div className="generated-content">{alert.content}</div>
                        <CopyDownload content={alert.content} />
                        <p className="small-text mt-2">
                          Draft saved. No message has been sent.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : (
              <section className="panel">
                <LockKeyhole size={25} />
                <h2>Turn evidence into careful updates.</h2>
                <p>
                  Coordinator tools bring situation briefs, change summaries,
                  verification requests, and multilingual alert drafts into one
                  workspace.
                </p>
                <p className="subtle">Sign in above to use these tools.</p>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function InternalReports({ incidentId }: { incidentId: string }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ reports: Report[] }>(
        `/api/coordinator/incidents/${incidentId}/reports`,
      );
      setReports(result.reports);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Internal reports could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details
      className="internal-reports"
      onToggle={(event) => {
        if (event.currentTarget.open && !reports && !busy) void load();
      }}
    >
      <summary>Internal report details</summary>
      <p className="small-text">
        Restricted to coordinators. Avoid sharing identifying details from
        original reports.
      </p>
      <ErrorMessage message={error} retry={load} />
      {busy && <p role="status">Loading internal reports…</p>}
      {reports?.map((r, index) => (
        <article className="internal-report" key={r.id}>
          <h3>
            Report {index + 1} · {label(r.sourceType)}
          </h3>
          <dl className="facts two-column">
            <div>
              <dt>Analysis</dt>
              <dd>{label(r.analysisStatus)}</dd>
            </div>
            <div>
              <dt>Input</dt>
              <dd>{label(r.inputType)}</dd>
            </div>
            <div>
              <dt>Observed</dt>
              <dd>{dateTime(r.observedAt)}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{dateTime(r.submittedAt)}</dd>
            </div>
          </dl>
          <h3>Original text</h3>
          <pre>{r.rawText || "No text supplied; this is a media report."}</pre>
          <p>
            <strong>Original channel:</strong> {r.origin || "Not supplied"}
          </p>
          <p>
            <strong>Location provided:</strong>{" "}
            {r.locationHint || "Not supplied"}
          </p>
          <p>
            <strong>Reporter notes:</strong> {r.notes || "None"}
          </p>
          {r.normalized && (
            <>
              <p>
                <strong>Normalized text:</strong> {r.normalized.normalizedText}
              </p>
              <p>
                <strong>Perspective:</strong>{" "}
                {label(r.normalized.sourcePerspective)}
              </p>
              <p>
                <strong>Extraction notes:</strong>{" "}
                {r.normalized.extractionNotes.join(" ") || "None"}
              </p>
            </>
          )}
          {r.analysisError && <ErrorMessage message={r.analysisError} />}
        </article>
      ))}
      {reports?.length === 0 && <p>No source reports are available.</p>}
    </details>
  );
}
