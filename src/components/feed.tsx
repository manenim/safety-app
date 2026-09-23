"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Search,
  SlidersHorizontal,
  RefreshCw,
  MapPin,
  ImageIcon,
  Mic,
  Radio,
  Route,
  ShieldCheck,
  X,
} from "lucide-react";
import type { IncidentView } from "@/domain/types";
import { statuses, severities, incidentTypes } from "@/domain/types";
import {
  Empty,
  ErrorMessage,
  IncidentCard,
  Loading,
  label,
  useApi,
} from "./ui";
import { SignalMap } from "./signal-map";

export function Feed() {
  const { data, loading, error, reload } = useApi<{
    incidents: IncidentView[];
    demoMode: boolean;
  }>("/api/incidents");
  const [now, setNow] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [type, setType] = useState("");
  const [hours, setHours] = useState("24");
  const [tab, setTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const filtered = (data?.incidents || [])
    .filter(
      (i) =>
        (!search ||
          `${i.title} ${i.summary} ${i.location.normalizedLabel} ${i.location.raw}`
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (!status || i.status === status) &&
        (!severity || i.severity === severity) &&
        (!type || i.incidentType === type) &&
        (!hours ||
          now - new Date(i.lastReportedAt).getTime() <=
            Number(hours) * 3600000) &&
        (tab === "all" ||
          (tab === "emerging"
            ? i.status === "emerging"
            : ["stale", "resolved"].includes(i.status))),
    )
    .sort(
      (a, b) => Date.parse(b.lastReportedAt) - Date.parse(a.lastReportedAt),
    );
  const filterCount = [
    search,
    status,
    severity,
    type,
    hours !== "24" ? "time" : "",
  ].filter(Boolean).length;
  const reset = () => {
    setSearch("");
    setStatus("");
    setSeverity("");
    setType("");
    setHours("");
    setTab("all");
  };
  return (
    <div className="social-feed-layout">
      <section className="social-timeline" aria-label="Community feed">
        <header className="timeline-header">
          <div>
            <h1>
              Home
              <span className="live-dot" />
            </h1>
            <p>Your community, in the loop.</p>
          </div>
          <div className="row">
            <button
              className="icon-button"
              title="Show map"
              aria-label="Show map"
              aria-pressed={showMap}
              onClick={() => setShowMap(!showMap)}
            >
              <MapPin size={20} />
            </button>
            <button
              className="icon-button"
              title="Filter signals"
              aria-label="Filter signals"
              aria-expanded={showFilters}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={20} />
              {filterCount > 0 && (
                <span className="filter-count">{filterCount}</span>
              )}
            </button>
            <button
              className="icon-button"
              title="Refresh feed"
              aria-label="Refresh feed"
              disabled={loading}
              onClick={() => {
                setNow(Date.now());
                void reload();
              }}
            >
              <RefreshCw size={19} className={loading ? "spin" : ""} />
            </button>
          </div>
        </header>
        <div className="feed-tabs" aria-label="Feed views">
          {[
            ["all", "Latest"],
            ["emerging", "Emerging"],
            ["earlier", "Earlier updates"],
          ].map(([id, title]) => (
            <button
              key={id}
              aria-pressed={tab === id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {title}
            </button>
          ))}
        </div>
        <div className="feed-composer">
          <span className="signal-avatar composer-avatar" aria-hidden="true">
            <Radio size={24} />
          </span>
          <div className="composer-body">
            <Link href="/report" className="composer-prompt">
              What’s happening around you?
            </Link>
            <p>A firsthand update can make a difference.</p>
            <div className="composer-bottom">
              <div className="composer-tools">
                <Link
                  href="/report?type=image"
                  aria-label="Share a photo"
                  title="Share a photo"
                >
                  <ImageIcon size={20} />
                </Link>
                <Link
                  href="/report?type=audio"
                  aria-label="Share an audio report"
                  title="Share an audio report"
                >
                  <Mic size={20} />
                </Link>
                <Link
                  href="/report"
                  aria-label="Report from a location"
                  title="Add a location"
                >
                  <MapPin size={20} />
                </Link>
              </div>
              <Link href="/report" className="button small">
                Post a report
                <Plus size={16} />
              </Link>
            </div>
          </div>
        </div>
        {showFilters && (
          <section className="timeline-filters" aria-label="Filter options">
            <div className="row between">
              <h2>Find a signal</h2>
              <button
                className="icon-button"
                aria-label="Close filters"
                onClick={() => setShowFilters(false)}
              >
                <X size={18} />
              </button>
            </div>
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label="Search incidents or locations"
                placeholder="Search incidents or locations"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <div className="filter-fields">
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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
                Severity
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="">All severities</option>
                  {severities.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Incident type
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="">All types</option>
                  {incidentTypes.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time window
                <select
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                >
                  <option value="1">Last hour</option>
                  <option value="6">Last 6 hours</option>
                  <option value="24">Last 24 hours</option>
                  <option value="168">Last 7 days</option>
                  <option value="">All time</option>
                </select>
              </label>
            </div>
            <button className="text-button" onClick={reset}>
              Clear filters
            </button>
          </section>
        )}
        {showMap && (
          <div className="timeline-map">
            <SignalMap incidents={filtered} />
          </div>
        )}
        {filterCount > 0 && !showFilters && (
          <div className="active-filter-note">
            {filtered.length} matching signals
            <button className="text-button" onClick={reset}>
              Clear filters
            </button>
          </div>
        )}
        <ErrorMessage message={error} retry={reload} />
        {loading && !data ? (
          <Loading />
        ) : (
          data && (
            <div className="feed-list">
              {!filtered.length ? (
                <Empty>
                  <span>No signals in this view. </span>
                  <button className="text-button" onClick={reset}>
                    See all signals
                  </button>
                </Empty>
              ) : (
                filtered.map((i) => <IncidentCard key={i.id} incident={i} />)
              )}
            </div>
          )
        )}
        {!!filtered.length && (
          <div className="feed-end">
            <ShieldCheck size={19} />
            <strong>You’re up to date.</strong>
            <span>Evidence evolves. Check back for new reports.</span>
          </div>
        )}
      </section>
      <aside className="social-right-rail">
        <label className="search-field rail-search">
          <Search size={19} />
          <input
            aria-label="Search community signals"
            placeholder="Search your community"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <section className="rail-section">
          <div className="rail-heading">
            <h2>Around the community</h2>
            <Radio size={19} />
          </div>
          <p className="rail-description">Places with recent reports</p>
          {(data?.incidents || [])
            .slice()
            .sort(
              (a, b) =>
                Date.parse(b.lastReportedAt) - Date.parse(a.lastReportedAt),
            )
            .slice(0, 4)
            .map((i) => (
              <Link
                href={`/incidents/${i.id}`}
                className="place-row"
                key={i.id}
              >
                <span className="place-eyebrow">{label(i.incidentType)}</span>
                <strong>
                  {i.location.normalizedLabel || i.location.raw || i.title}
                </strong>
                <span>
                  {i.reportCount} reports · {label(i.status)}
                </span>
              </Link>
            ))}
          <button
            className="text-button rail-map-link"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? "Hide community map" : "Explore the map"}
            <ArrowUpRight size={16} />
          </button>
        </section>
        <section className="rail-section rail-note">
          <span className="rail-icon">
            <MessageIcon />
          </span>
          <h2>There’s more to the story.</h2>
          <p>Get past the forwards. Ask what the evidence actually supports.</p>
          <Link href="/ask" className="button secondary">
            Ask SignalCheck
            <ArrowUpRight size={16} />
          </Link>
        </section>
        <Link href="/routes" className="rail-route">
          <Route size={25} />
          <span>
            <strong>Heading out?</strong>
            <span>Check reports along your route</span>
          </span>
          <ArrowUpRight size={18} />
        </Link>
        <p className="rail-footer">
          Community reports. Independent evidence.
          <br />
          No report is a guarantee of safety.
        </p>
      </aside>
    </div>
  );
}
function MessageIcon() {
  return <ShieldCheck size={23} />;
}
