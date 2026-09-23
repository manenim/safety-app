"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Clock3,
  Users,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import type { IncidentView } from "@/domain/types";
import {
  dateTime,
  ErrorMessage,
  label,
  Loading,
  SeverityBadge,
  StatusBadge,
  timeAgo,
  useApi,
} from "./ui";
import { SignalMap } from "./signal-map";
export function IncidentDetail({ id }: { id: string }) {
  const { data, error, loading, reload } = useApi<{ incident: IncidentView }>(
    `/api/incidents/${encodeURIComponent(id)}`,
  );
  const [tab, setTab] = useState("evidence");

  if (loading) return <Loading text="Loading incident evidence…" />;
  if (error || !data)
    return (
      <>
        <Link href="/" className="back-link">
          <ArrowLeft size={16} />
          Feed
        </Link>
        <ErrorMessage
          message={error || "This incident was not found."}
          retry={reload}
        />
      </>
    );
  const i = data.incident;
  const claimText = (claimId: string) =>
    i.claims.find((c) => c.id === claimId)?.text || "Related report claim";

  return (
    <>
      <Link href="/" className="back-link">
        <ArrowLeft size={16} />
        Feed
      </Link>
      <div className="detail-heading">
        <div className="row wrap">
          <StatusBadge status={i.status} />
          <SeverityBadge severity={i.severity} />
          <span className="subtle">{label(i.incidentType)}</span>
        </div>
        <h1>{i.title}</h1>
        <div className="meta">
          <span>
            <MapPin size={16} />
            {i.location.normalizedLabel ||
              i.location.raw ||
              "Location unconfirmed"}
          </span>
          <span>
            <Clock3 size={16} />
            Latest report {timeAgo(i.lastReportedAt)}
          </span>
        </div>
        <p className="detail-summary">{i.summary}</p>
        <div className="row wrap">
          <Link className="button secondary" href={`/ask?incidentId=${i.id}`}>
            <MessageSquare size={17} />
            Ask about this incident
          </Link>
          <Link
            className="text-button"
            href={`/command-center?incidentId=${i.id}`}
          >
            Coordinator tools
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </div>

      {i.status === "stale" && (
        <div className="notice amber mb-6">
          <Clock3 size={18} />
          <p>
            <strong>This signal is stale.</strong> The evidence has not been
            refreshed recently. Seek a current update before relying on it.
          </p>
        </div>
      )}
      {i.status === "resolved" && (
        <div className="notice mb-6">
          <ShieldCheck size={18} />
          <p>
            This incident is marked resolved. That reflects available reports
            and does not guarantee safety in the area.
          </p>
        </div>
      )}

      <div className="detail-metrics">
        <div>
          <Users size={18} />
          <strong>{i.independentSourceCount}</strong>
          <span>Independent sources</span>
        </div>
        <div>
          <strong>{i.supportingReports}</strong>
          <span>Supporting reports</span>
        </div>
        <div>
          <strong>{i.contradictingReports}</strong>
          <span>Conflicting reports</span>
        </div>
        <div>
          <strong>{i.firsthandCount}</strong>
          <span>Firsthand reports</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-line mb-6 overflow-x-auto whitespace-nowrap">
        {["evidence", "reports", "timeline"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            className={`pb-3 text-[15px] font-medium transition-colors border-b-2 ${
              tab === t
                ? "border-teal text-ink font-semibold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t === "evidence" && "Evidence & Claims"}
            {t === "reports" && `Reports (${i.reports.length})`}
            {t === "timeline" && "Timeline"}
          </button>
        ))}
      </div>

      <div className="max-w-[800px]">
        {tab === "evidence" && (
          <div className="stack">
            <details className="extra-details incident-map-disclosure">
              <summary>View location on the map</summary>
              <SignalMap incidents={[i]} />
            </details>
            <section className="panel">
              <h2>Why this status?</h2>
              <ul className="explanation-list">
                {i.explanation.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
              <div className="inset">
                <strong>Next verification step</strong>
                <p>{i.verificationRecommendation}</p>
              </div>
            </section>
            <section className="panel">
              <div className="section-heading compact">
                <h2>Claims & supporting evidence</h2>
                <span className="count">{i.claims.length}</span>
              </div>
              <p className="section-intro">
                Each claim is assessed separately. Corroboration of a road
                disruption does not confirm a separate claim of violence.
              </p>
              {i.claims.length ? (
                i.claims.map((claim) => (
                  <article className="claim" key={claim.id}>
                    <div className="row wrap">
                      <StatusBadge status={claim.status} />
                      <span className="subtle">{label(claim.category)}</span>
                    </div>
                    <h3>{claim.text}</h3>
                    <div className="evidence-counts">
                      <span>
                        <strong>{claim.supportingSources}</strong> supporting
                        sources
                      </span>
                      <span>
                        <strong>{claim.denyingSources}</strong> denying sources
                      </span>
                      <span>
                        <strong>{claim.uncertainSources}</strong> uncertain
                        sources
                      </span>
                    </div>
                    <details>
                      <summary>
                        Inspect source evidence ({claim.reports.length})
                      </summary>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Source</th>
                              <th>Position</th>
                              <th>Perspective</th>
                              <th>Observed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {claim.reports.map((r, index) => (
                              <tr key={`${r.reportId}-${index}`}>
                                <td>
                                  <a href={`#report-${r.reportId}`}>
                                    {label(r.sourceType)}
                                  </a>
                                </td>
                                <td>
                                  <span className={`stance stance-${r.stance}`}>
                                    {label(r.stance)}
                                  </span>
                                </td>
                                <td>{label(r.perspective)}</td>
                                <td>{dateTime(r.observedAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </article>
                ))
              ) : (
                <p>No individual claims have been extracted yet.</p>
              )}
            </section>
            <details className="extra-details">
              <summary>
                Explore evidence relationships ({i.relations.length})
              </summary>
              {i.relations.length ? (
                <ul className="relations">
                  {i.relations.map((r) => (
                    <li key={r.id}>
                      <span
                        className={`stance stance-${r.relation === "contradicts" ? "deny" : "support"}`}
                      >
                        {label(r.relation)}
                      </span>
                      <p>
                        <strong>{claimText(r.claimAId)}</strong>
                      </p>
                      <p className="subtle">
                        Related to: {claimText(r.claimBId)}
                      </p>
                      <p>{r.explanation}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="subtle">
                  No explicit relationships between claims have been recorded.
                </p>
              )}
            </details>
          </div>
        )}

        {tab === "reports" && (
          <section className="panel">
            <h2>
              Anonymized reports{" "}
              <span className="count">{i.reports.length}</span>
            </h2>
            <p className="section-intro">
              Source labels provide context; they do not establish truth.
              Repeated or forwarded reports may share one origin.
            </p>
            {i.reports.map((r, index) => (
              <article className="report-item" id={`report-${r.id}`} key={r.id}>
                <div className="row between wrap">
                  <strong>
                    Report {index + 1} · {label(r.sourceType)}
                  </strong>
                  {r.duplicate && (
                    <span className="badge status-stale">Repeated origin</span>
                  )}
                </div>
                <p>{r.summary}</p>
                <div className="meta">
                  <span>{label(r.perspective)}</span>
                  <span>{label(r.inputType)}</span>
                  <span>{r.language}</span>
                </div>
                <p className="small-text">
                  Observed {dateTime(r.observedAt)}
                  <br />
                  Submitted {dateTime(r.submittedAt)}
                </p>
              </article>
            ))}
          </section>
        )}

        {tab === "timeline" && (
          <div className="stack">
            <section className="panel">
              <h2>Freshness</h2>
              <dl className="facts two-column">
                <div>
                  <dt>First reported</dt>
                  <dd>{dateTime(i.firstReportedAt)}</dd>
                </div>
                <div>
                  <dt>Latest report</dt>
                  <dd>{dateTime(i.lastReportedAt)}</dd>
                </div>
                <div>
                  <dt>Last corroborated</dt>
                  <dd>{dateTime(i.lastCorroboratedAt)}</dd>
                </div>
                <div>
                  <dt>Status updated</dt>
                  <dd>{dateTime(i.statusUpdatedAt)}</dd>
                </div>
                {i.resolvedAt && (
                  <div>
                    <dt>Resolved</dt>
                    <dd>{dateTime(i.resolvedAt)}</dd>
                  </div>
                )}
              </dl>
            </section>
            <section className="panel">
              <h2>Evidence timeline</h2>
              <ol className="timeline">
                {i.timeline.map((event) => (
                  <li key={event.id}>
                    <time dateTime={event.createdAt}>
                      {dateTime(event.createdAt)}
                    </time>
                    <div>
                      <StatusBadge status={event.newStatus} />
                    </div>
                    {event.reason.map((reason, index) => (
                      <p key={index}>{reason}</p>
                    ))}
                  </li>
                ))}
                {!i.timeline.length && (
                  <li>
                    <p>No status changes recorded yet.</p>
                  </li>
                )}
              </ol>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
