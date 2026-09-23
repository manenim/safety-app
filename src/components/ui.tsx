"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Radio,
  Home,
  PlusCircle,
  MessageCircle,
  Route,
  Wrench,
  Users,
  FileText,
  Zap,
  Flame,
} from "lucide-react";
import type { IncidentView, Status, Severity } from "@/domain/types";

export const label = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export function timeAgo(value: string | null) {
  if (!value) return "Not yet corroborated";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60000),
  );
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}
export const dateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not available";
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const data = await res.json();
  if (!res.ok)
    throw new Error(
      data.error || "This request could not be completed. Please try again.",
    );
  return data as T;
}
export const post = <T,>(url: string, body: unknown) =>
  api<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<T>(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);
  return { data, error, loading, reload };
}
export function ErrorMessage({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  if (!message) return null;
  return (
    <div className="error-message" role="alert">
      <AlertTriangle size={19} />
      <div>
        {message}
        {retry && (
          <button type="button" className="text-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Loading({
  text = "Loading current signals…",
}: {
  text?: string;
}) {
  return (
    <div className="loading" role="status">
      <div className="loading-label">
        <RefreshCw size={18} className="spin" />
        {text}
      </div>
      {[0, 1, 2].map((x) => (
        <div key={x} className="skeleton" />
      ))}
    </div>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge status-${status}`}>
      <span className="status-dot" />
      {label(status)}
    </span>
  );
}
export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`severity severity-${severity}`}>
      {label(severity)} severity
    </span>
  );
}
export function Empty({
  title = "No signals match these filters",
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <Radio size={28} />
      <h3>{title}</h3>
      <p>
        {children ||
          "Try a wider time window or clear your filters. No known reports does not guarantee safety."}
      </p>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function IncidentCard({ incident }: { incident: IncidentView }) {
  const Icon =
    incident.incidentType === "road_blockage"
      ? Route
      : incident.incidentType === "infrastructure_failure"
        ? Zap
        : incident.incidentType === "fire"
          ? Flame
          : Radio;
  return (
    <article
      className={`incident-card ${incident.status === "stale" || incident.status === "resolved" ? "quiet-card" : ""}`}
    >
      <div
        className={`signal-avatar avatar-${incident.incidentType}`}
        aria-hidden="true"
      >
        <Icon size={23} strokeWidth={1.8} />
      </div>
      <div className="post-body">
        <div className="post-byline">
          <strong>
            {incident.location.normalizedLabel ||
              incident.location.raw ||
              "Community signal"}
          </strong>
          <span title={dateTime(incident.lastReportedAt)}>
            · {timeAgo(incident.lastReportedAt)}
          </span>
          <Link
            href={`/incidents/${incident.id}`}
            aria-label={`Open ${incident.title}`}
            className="post-open"
          >
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="post-category">{label(incident.incidentType)}</div>
        <h3>
          <Link href={`/incidents/${incident.id}`}>{incident.title}</Link>
        </h3>
        <p className="incident-summary">{incident.summary}</p>
        <div className="post-evidence">
          <div className="row wrap">
            <StatusBadge status={incident.status} />
            <SeverityBadge severity={incident.severity} />
          </div>
          <p className="post-evidence-note">
            {incident.independentSourceCount} independent source
            {incident.independentSourceCount !== 1 ? "s" : ""}
            {incident.contradictingReports > 0 && (
              <span className="contradiction">
                {" · "}
                {incident.contradictingReports} conflicting report
                {incident.contradictingReports !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
        <div className="post-actions">
          <Link
            href={`/incidents/${incident.id}`}
            aria-label={`View ${incident.reportCount} reports for ${incident.title}`}
          >
            <FileText size={18} />
            <span>{incident.reportCount} reports</span>
          </Link>
          <Link
            href={`/incidents/${incident.id}`}
            aria-label={`View evidence for ${incident.title}`}
          >
            <Users size={18} />
            <span>Evidence</span>
          </Link>
          <Link href={`/ask?incidentId=${incident.id}`}>
            <MessageCircle size={18} />
            <span>Ask</span>
          </Link>
          <Link
            href="/report"
            aria-label={`Report an update about ${incident.title}`}
          >
            <PlusCircle size={18} />
            <span>Update</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
const nav = [
  { href: "/", label: "Feed", icon: Home, mobileLabel: "Feed" },
  { href: "/report", label: "Report", icon: PlusCircle, mobileLabel: "Report" },
  { href: "/ask", label: "Ask", icon: MessageCircle, mobileLabel: "Ask" },
  { href: "/routes", label: "Routes", icon: Route, mobileLabel: "Routes" },
  {
    href: "/command-center",
    label: "Coordinator",
    icon: Wrench,
    mobileLabel: "Tools",
  },
];
function isActive(pathname: string, href: string) {
  return (
    pathname === href || (href === "/" && pathname.startsWith("/incidents"))
  );
}
function Brand() {
  return (
    <>
      <Image
        className="brand-mark"
        src="/signalcheck-mark.svg"
        width={40}
        height={40}
        alt=""
        preload
      />
      <span className="brand-word">
        Signal<span className="brand-check">Check</span>
      </span>
    </>
  );
}
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {/* ── desktop sidebar ── */}
      <aside className="desktop-sidebar" aria-label="Main navigation">
        <Link href="/" className="brand" aria-label="SignalCheck home">
          <Brand />
        </Link>
        <nav className="sidebar-nav">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(pathname, item.href) ? "active" : ""}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              title={item.label}
            >
              <item.icon size={22} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-cta">
          <Link href="/report" className="button">
            <PlusCircle size={18} />
            <span>Post a report</span>
          </Link>
        </div>
        <div className="sidebar-footer">
          <p>
            <ShieldCheck size={14} /> Community evidence, with context.
          </p>
          <span>Evidence before certainty.</span>
        </div>
      </aside>
      {/* ── mobile top header ── */}
      <header className="mobile-header">
        <Link href="/" className="brand" aria-label="SignalCheck home">
          <Brand />
        </Link>
      </header>
      {/* ── main content ── */}
      <div className="shell-layout">
        <main id="main-content" className="main-content">
          <div
            className={`main-inner ${pathname === "/" ? "home-page" : "inner-page"} ${pathname === "/command-center" ? "coordinator-page" : ""}`}
          >
            {children}
          </div>
        </main>
      </div>
      {/* ── mobile bottom bar ── */}
      <nav className="mobile-bottom-bar" aria-label="Main navigation">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(pathname, item.href) ? "active" : ""}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <item.icon size={22} />
            {item.mobileLabel}
          </Link>
        ))}
      </nav>
    </>
  );
}
export function CopyDownload({
  content,
  name = "signalcheck-alert",
}: {
  content: string;
  name?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        "Copy is unavailable in this browser. Select and copy the text instead.",
      );
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="row">
        <button type="button" className="button secondary small" onClick={copy}>
          {copied ? "Copied" : "Copy text"}
        </button>
        <button
          type="button"
          className="button secondary small"
          onClick={download}
        >
          Download .txt
        </button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </div>
      <ErrorMessage message={error} />
    </>
  );
}
