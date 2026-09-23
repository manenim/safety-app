"use client";
import { useState } from "react";
import { Route, ArrowDownUp } from "lucide-react";
import type { RouteResult } from "@/domain/types";
import { ErrorMessage, IncidentCard, label, PageHeading, post } from "./ui";
import { SignalMap } from "./signal-map";
import { LocationAutocomplete } from "./location-autocomplete";
export function RouteCheck() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [originPlaceId, setOriginPlaceId] = useState<string>();
  const [destinationPlaceId, setDestinationPlaceId] = useState<string>();
  const [result, setResult] = useState<RouteResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function check(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(
        await post<RouteResult>("/api/route-check", {
          origin,
          destination,
          originPlaceId,
          destinationPlaceId,
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The route could not be checked. Try a more specific location.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Check the signals along your route."
        description="Compare your journey with known community reports. Conditions can change, and an absence of reports does not guarantee safety."
      />
      <div className="route-layout">
        <div className="stack">
          <form className="panel form-fields" onSubmit={check}>
            <h2>
              <Route size={21} />
              Plan a route check
            </h2>
            <LocationAutocomplete
              label="Starting point"
              required
              placeholder="Place, address, or landmark"
              value={origin}
              onChange={(value) => {
                setOrigin(value);
                setOriginPlaceId(undefined);
              }}
              onSelect={(place) => setOriginPlaceId(place.id)}
              disabled={busy}
            />
            <button
              type="button"
              className="text-button swap-button"
              disabled={busy}
              onClick={() => {
                setOrigin(destination);
                setDestination(origin);
                setOriginPlaceId(destinationPlaceId);
                setDestinationPlaceId(originPlaceId);
              }}
            >
              <ArrowDownUp size={16} />
              Swap locations
            </button>
            <LocationAutocomplete
              label="Destination"
              required
              placeholder="Where are you heading?"
              value={destination}
              onChange={(value) => {
                setDestination(value);
                setDestinationPlaceId(undefined);
              }}
              onSelect={(place) => setDestinationPlaceId(place.id)}
              disabled={busy}
            />
            <p className="field-help">
              Include a city or region for more accurate matching.
            </p>
            <ErrorMessage message={error} />
            <button className="button" type="submit" disabled={busy}>
              {busy ? "Checking route evidence…" : "Check route"}
            </button>
          </form>
          <div className="plain-note">
            <strong>A route check is an evidence check.</strong>
            <p>
              Reported incidents may be delayed or have uncertain locations. An
              alternative route is not a safety recommendation.
            </p>
          </div>
        </div>
        <div className="stack">
          {busy && (
            <div className="empty" role="status">
              <Route size={30} />
              <h2>Reviewing your route</h2>
              <p>Looking up the journey and checking nearby signals…</p>
            </div>
          )}
          {!result && !busy && (
            <div className="route-empty">
              <Route size={43} />
              <h2>Know what’s been reported.</h2>
              <p>
                Enter your starting point and destination to see mapped
                incidents, evidence status, and the freshness of nearby reports.
              </p>
            </div>
          )}
          {result && (
            <>
              <section
                className={`panel route-result state-${result.state}`}
                aria-live="polite"
              >
                <span className="badge">{label(result.state)}</span>
                <h2>
                  {result.origin} <span className="subtle">to</span>{" "}
                  {result.destination}
                </h2>
                <p>{result.summary}</p>
                <div className="row wrap route-facts">
                  <strong>
                    {(result.distanceMeters / 1000).toFixed(1)} km
                  </strong>
                  <span>
                    About {Math.ceil(result.durationSeconds / 60)} min
                  </span>
                  <span>{result.incidents.length} nearby signals</span>
                </div>
                {result.unlocatedCount > 0 && (
                  <p className="notice-text">
                    {result.unlocatedCount} active signal
                    {result.unlocatedCount !== 1 ? "s have" : " has"} no
                    confirmed location and could not be checked against this
                    route.
                  </p>
                )}
              </section>
              <SignalMap
                incidents={result.incidents.map((i) => i.incident)}
                geometry={result.geometry}
                originLabel={result.origin}
                destinationLabel={result.destination}
                alternatives={result.alternatives.map((a) => a.geometry)}
              />
              {result.incidents.length > 0 && (
                <section>
                  <h2>Signals near this route</h2>
                  {result.incidents.map(({ incident, distanceMeters }) => (
                    <div key={incident.id}>
                      <p className="route-distance">
                        Approximately{" "}
                        {distanceMeters >= 1000
                          ? `${(distanceMeters / 1000).toFixed(1)} km`
                          : `${Math.round(distanceMeters)} m`}{" "}
                        from route
                      </p>
                      <IncidentCard incident={incident} />
                    </div>
                  ))}
                </section>
              )}
              {result.alternatives.length > 0 && (
                <section className="panel">
                  <h2>Other routes returned</h2>
                  <p className="subtle">
                    Shown in gray on the map. These alternatives have not been
                    assessed for safety.
                  </p>
                  {result.alternatives.map((alt, index) => (
                    <p key={index}>
                      <strong>Alternative {index + 1}</strong> ·{" "}
                      {(alt.distanceMeters / 1000).toFixed(1)} km · About{" "}
                      {Math.ceil(alt.durationSeconds / 60)} min
                    </p>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
