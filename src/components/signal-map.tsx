"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import type { IncidentView } from "@/domain/types";
import { label } from "./ui";
import { loadGoogleMaps } from "@/lib/google-maps-browser";
const colors: Record<string, string> = {
  unverified: "#6b7280",
  emerging: "#b66b10",
  corroborated: "#087b75",
  conflicting: "#b64444",
  stale: "#8b9098",
  resolved: "#508166",
};
export function SignalMap({
  incidents,
  geometry,
  alternatives = [],
  originLabel = "Starting point",
  destinationLabel = "Destination",
}: {
  incidents: IncidentView[];
  geometry?: [number, number][];
  alternatives?: [number, number][][];
  originLabel?: string;
  destinationLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const token = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const located = incidents.filter(
    (i) => i.location.latitude != null && i.location.longitude != null,
  );
  // Serialize the displayed map inputs so unrelated parent renders do not
  // tear down the WebGL map. Include titles so accessible markers stay current.
  const locatedData = JSON.stringify(
    located.map(({ id, title, status, location, incidentType, isDemo }) => ({
      id,
      title,
      status,
      location,
      incidentType,
      isDemo,
    })),
  );
  const geometryData = JSON.stringify(geometry || []);
  const alternativesData = JSON.stringify(alternatives);
  useEffect(() => {
    if (!token || !ref.current) return;
    const container = ref.current;
    let cancelled = false;
    let map: google.maps.Map | undefined;
    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const lines: google.maps.Polyline[] = [];
    const mappedIncidents = JSON.parse(locatedData) as Pick<
      IncidentView,
      "id" | "title" | "status" | "location" | "incidentType" | "isDemo"
    >[];
    const routeGeometry = JSON.parse(geometryData) as [number, number][];
    const alternateGeometries = JSON.parse(alternativesData) as [
      number,
      number,
    ][][];
    const points = [
      ...mappedIncidents.map((i) => ({
        lat: i.location.latitude!,
        lng: i.location.longitude!,
      })),
      ...routeGeometry.map(([lng, lat]) => ({ lat, lng })),
    ];
    const timer = setTimeout(() => {
      if (!cancelled)
        setError(
          "The map could not load. Check your connection or use the location list below.",
        );
    }, 15000);
    void loadGoogleMaps(token)
      .then(({ maps, marker }) => {
        if (cancelled) return;
        setReady(false);
        setError("");
        map = new maps.Map(container, {
          center: points[0] || { lat: 9.0765, lng: 7.3986 },
          zoom: 11,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "cooperative",
        });
        map.addListener("tilesloaded", () => {
          if (cancelled) return;
          clearTimeout(timer);
          setReady(true);
          setError("");
        });
        if (points.length > 1) {
          const bounds = new google.maps.LatLngBounds();
          points.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds, 55);
        }
        alternateGeometries.forEach((line) =>
          lines.push(
            new maps.Polyline({
              map,
              path: line.map(([lng, lat]) => ({ lat, lng })),
              strokeColor: "#889daa",
              strokeWeight: 3,
              strokeOpacity: 0.85,
            }),
          ),
        );
        if (routeGeometry.length > 1)
          lines.push(
            new maps.Polyline({
              map,
              path: routeGeometry.map(([lng, lat]) => ({ lat, lng })),
              strokeColor: "#087b75",
              strokeWeight: 5,
              strokeOpacity: 0.95,
            }),
          );
        if (routeGeometry.length > 1) {
          const endpoints = [
            {
              point: routeGeometry[0],
              letter: "A",
              name: "Start",
              label: originLabel,
            },
            {
              point: routeGeometry[routeGeometry.length - 1],
              letter: "B",
              name: "Destination",
              label: destinationLabel,
            },
          ];
          endpoints.forEach((endpoint) => {
            const el = document.createElement("div");
            el.className = `map-endpoint-marker map-endpoint-${endpoint.letter.toLowerCase()}`;
            el.setAttribute("role", "img");
            el.setAttribute(
              "aria-label",
              `${endpoint.name}: ${endpoint.label}`,
            );
            el.title = `${endpoint.name}: ${endpoint.label}`;
            const svg = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "svg",
            );
            svg.setAttribute("viewBox", "0 0 32 42");
            svg.setAttribute("aria-hidden", "true");
            const path = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            path.setAttribute(
              "d",
              "M16 40C13 36 2 25 2 16a14 14 0 1 1 28 0c0 9-11 20-14 24Z",
            );
            path.setAttribute("fill", "currentColor");
            path.setAttribute("stroke", "white");
            path.setAttribute("stroke-width", "2");
            path.setAttribute("stroke-linejoin", "round");
            const center = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "circle",
            );
            center.setAttribute("cx", "16");
            center.setAttribute("cy", "16");
            center.setAttribute("r", "5");
            center.setAttribute("fill", "white");
            svg.append(path, center);
            el.append(svg);
            markers.push(
              new marker.AdvancedMarkerElement({
                map,
                position: { lng: endpoint.point[0], lat: endpoint.point[1] },
                content: el,
                title: el.title,
                zIndex: 30,
              }),
            );
          });
        }
        mappedIncidents.forEach((incident) => {
          const el = document.createElement("a");
          el.className = "map-report-marker";
          const markerLabel = `${incident.title} · ${label(incident.status)}`;
          el.title = markerLabel;
          const svg = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "svg",
          );
          svg.setAttribute("viewBox", "0 0 24 24");
          svg.setAttribute("aria-hidden", "true");
          svg.setAttribute("fill", "none");
          svg.setAttribute("stroke", "currentColor");
          svg.setAttribute("stroke-width", "2");
          svg.setAttribute("stroke-linecap", "round");
          svg.setAttribute("stroke-linejoin", "round");
          const path = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "path",
          );
          const symbols: Record<string, string> = {
            road_blockage: "M4 7h16v8H4z M7 7l6 8 M13 7l6 8 M7 15v5 M17 15v5",
            fire: "M12 3c2 5 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 0 3 2 4 3 4V3Z",
            infrastructure_failure: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
            security_presence:
              "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z M9 12l2 2 4-4",
          };
          path.setAttribute(
            "d",
            symbols[incident.incidentType] ||
              "m12 3 10 18H2L12 3Z M12 9v5 M12 17h.01",
          );
          svg.append(path);
          el.append(svg);
          el.href = `/incidents/${incident.id}`;
          el.setAttribute("aria-label", markerLabel);
          el.style.backgroundColor = colors[incident.status];
          markers.push(
            new marker.AdvancedMarkerElement({
              map,
              position: {
                lat: incident.location.latitude!,
                lng: incident.location.longitude!,
              },
              content: el,
              title: markerLabel,
              zIndex: 20,
            }),
          );
        });
      })
      .catch(() => {
        clearTimeout(timer);
        if (!cancelled)
          setError(
            "The interactive map is unavailable. Incident locations are listed below.",
          );
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      markers.forEach((marker) => {
        marker.map = null;
      });
      lines.forEach((line) => line.setMap(null));
      if (map) google.maps.event.clearInstanceListeners(map);
      container.replaceChildren();
    };
  }, [
    token,
    locatedData,
    geometryData,
    alternativesData,
    originLabel,
    destinationLabel,
  ]);
  return (
    <section className="map-panel" aria-label="Incident map">
      <div className="section-heading compact">
        <h2>
          <MapPin size={18} />
          Area overview
        </h2>
        <span className="subtle">
          {located.length} mapped signal{located.length !== 1 ? "s" : ""}
        </span>
      </div>
      {token ? (
        <div className="map-container">
          <div ref={ref} className="map-canvas" />
          {!ready && !error && (
            <span className="map-state" role="status">
              Loading map…
            </span>
          )}
          {error && <span className="map-state">{error}</span>}
        </div>
      ) : (
        <div className="map-fallback">
          <MapPin size={30} />
          <strong>Location overview</strong>
          <p>
            Interactive maps are unavailable. Use the location list to explore
            the evidence.
          </p>
        </div>
      )}
      {geometry && geometry.length > 1 && (
        <div className="map-endpoint-key">
          <span>
            <b aria-hidden="true">
              <MapPin size={16} />
            </b>
            <span>
              <strong>Start</strong>
              {originLabel}
            </span>
          </span>
          <span>
            <b aria-hidden="true">
              <MapPin size={16} />
            </b>
            <span>
              <strong>Destination</strong>
              {destinationLabel}
            </span>
          </span>
        </div>
      )}
      <div className="map-legend">
        {["corroborated", "emerging", "conflicting", "unverified"].map((s) => (
          <span key={s}>
            <i style={{ background: colors[s] }} />
            {label(s)}
          </span>
        ))}
      </div>
      {located.length > 0 && (
        <p className="map-note">
          Icons show the report type; colors show evidence status. Select a
          marker to view the report.
        </p>
      )}
      <details className="map-locations">
        <summary>View accessible location list ({incidents.length})</summary>
        {incidents.length ? (
          incidents.map((i) => (
            <Link href={`/incidents/${i.id}`} key={i.id}>
              <strong>{i.title}</strong>
              <span>
                {i.location.normalizedLabel ||
                  i.location.raw ||
                  "Location unconfirmed"}{" "}
                · {label(i.status)}
                {i.location.latitude == null ? " · Not mapped" : ""}
              </span>
            </Link>
          ))
        ) : (
          <p>No incidents in this view. This does not guarantee safety.</p>
        )}
      </details>
      {incidents.length > located.length && (
        <p className="map-note">
          {incidents.length - located.length} signal
          {incidents.length - located.length !== 1 ? "s" : ""} without confirmed
          coordinates.
        </p>
      )}
    </section>
  );
}
