"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  FileText,
  ImageIcon,
  Mic,
  Upload,
  CheckCircle2,
  Square,
  ArrowUpRight,
  X,
} from "lucide-react";
import { sourceTypes } from "@/domain/types";
import { LocationAutocomplete } from "./location-autocomplete";
import { audioExtension } from "@/lib/media";
import type {
  IncidentView,
  NormalizedReport,
  ReportInput,
} from "@/domain/types";
import { api, ErrorMessage, label, PageHeading, post, StatusBadge } from "./ui";
type Result = {
  report: {
    id: string;
    analysisStatus: "pending" | "complete" | "failed";
    normalized: NormalizedReport | null;
    analysisError: string | null;
  };
  incident: IncidentView | null;
};
function AudioPreview({ file }: { file: File }) {
  const player = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (player.current) player.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <audio
      ref={player}
      controls
      aria-label="Preview voice note"
      style={{ width: "100%", maxWidth: 360 }}
    />
  );
}
export function ReportForm() {
  const params = useSearchParams();
  const requestedType = params.get("type");
  const [inputType, setInputType] = useState<ReportInput["inputType"]>(
    requestedType === "image" ||
      requestedType === "audio" ||
      requestedType === "screenshot"
      ? requestedType
      : "text",
  );
  const [locationHint, setLocationHint] = useState("");
  const [locationPlaceId, setLocationPlaceId] = useState<string>();
  const [file, setFile] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const resultDialog = useRef<HTMLDialogElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const hasResult = result !== null;
  useEffect(() => {
    if (!hasResult || !resultDialog.current) return;
    const dialog = resultDialog.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    resultHeading.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [hasResult]);
  function closeResult() {
    setResult(null);
    setError("");
    form.current
      ?.querySelector<HTMLButtonElement>('button[type="submit"]')
      ?.focus();
  }
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  async function startRecording() {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Voice recording is unavailable in this browser. Upload an audio file instead.",
        );
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      const r = new MediaRecorder(
        stream.current,
        mimeType ? { mimeType } : undefined,
      );
      recorder.current = r;
      const chunks: BlobPart[] = [];
      r.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      r.onstop = () => {
        const type = r.mimeType || mimeType || "audio/webm";
        const audio = new File(chunks, `voice-report.${audioExtension(type)}`, {
          type,
        });
        if (audio.size) {
          setFile(audio);
          if (fileInput.current) fileInput.current.value = "";
        } else {
          setFile(null);
          setError(
            "No audio was captured. Please record your voice note again.",
          );
        }
        setRecording(false);
        stream.current?.getTracks().forEach((track) => track.stop());
      };
      r.start();
      setRecording(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Microphone access failed. Upload an audio file instead.",
      );
      stream.current?.getTracks().forEach((track) => track.stop());
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    const payload = new FormData(event.currentTarget);
    payload.set("inputType", inputType);
    if (locationPlaceId) payload.set("locationPlaceId", locationPlaceId);
    if (inputType !== "text" && !file) {
      setError("Choose a file or record a voice report before submitting.");
      return;
    }
    if (file && inputType !== "text") payload.set("media", file);
    const observedAt = String(payload.get("observedAt") || "");
    payload.set(
      "observedAt",
      observedAt ? new Date(observedAt).toISOString() : "",
    );
    setBusy(true);
    try {
      const saved = await api<Result>("/api/reports", {
        method: "POST",
        body: payload,
      });
      form.current?.reset();
      setLocationHint("");
      setLocationPlaceId(undefined);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setResult(saved);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Your report could not be submitted. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await post<Result>(`/api/reports/${result.report.id}/retry`, {}),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Analysis could not be retried.",
      );
    } finally {
      setBusy(false);
    }
  }
  const extracted = result?.report.normalized;
  return (
    <>
      <PageHeading
        title="Post a report"
        description="What did you notice? Share what you saw, heard, or captured."
      />
      <div className="form-layout">
        <div>
          <form className="panel report-form" onSubmit={submit} ref={form}>
            <fieldset disabled={busy || recording}>
              <legend>How would you like to report?</legend>
              <div className="input-type-tabs">
                {(
                  [
                    ["text", "Text", FileText],
                    ["audio", "Audio", Mic],
                    ["image", "Image", ImageIcon],
                    ["screenshot", "Screenshot", Upload],
                  ] as const
                ).map(([value, title, Icon]) => (
                  <button
                    type="button"
                    key={value}
                    className={inputType === value ? "selected" : ""}
                    aria-pressed={inputType === value}
                    onClick={() => {
                      setInputType(value);
                      setFile(null);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                  >
                    <Icon size={20} />
                    {title}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="form-fields">
              <label>
                {inputType === "text"
                  ? "What happened?"
                  : "Add context (optional)"}
                <textarea
                  name="text"
                  required={inputType === "text"}
                  minLength={inputType === "text" ? 10 : undefined}
                  maxLength={12000}
                  rows={5}
                  placeholder="Describe what you saw or heard. Include a nearby landmark and when it happened."
                  disabled={busy}
                />
              </label>
              {inputType !== "text" && (
                <div className="upload-area">
                  <Upload size={23} />
                  <label htmlFor="media">
                    {inputType === "audio"
                      ? "Upload an audio recording"
                      : inputType === "screenshot"
                        ? "Upload a screenshot"
                        : "Upload an image"}
                  </label>
                  <input
                    ref={fileInput}
                    id="media"
                    type="file"
                    accept={
                      inputType === "audio"
                        ? "audio/*"
                        : "image/jpeg,image/png,image/webp"
                    }
                    disabled={busy || recording}
                    onChange={(e) => {
                      setFile(e.target.files?.[0] || null);
                      setError("");
                    }}
                  />
                  <p className="small-text">
                    {file
                      ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB`
                      : inputType === "audio"
                        ? "MP3, WAV, M4A, OGG or WebM. Maximum 10 MB."
                        : "JPG, PNG or WebP. Maximum 10 MB."}
                  </p>
                  {inputType === "audio" && file && (
                    <AudioPreview file={file} />
                  )}
                  {inputType === "audio" && (
                    <button
                      type="button"
                      className={`button secondary small ${recording ? "recording" : ""}`}
                      disabled={busy}
                      onClick={() =>
                        recording
                          ? recorder.current?.stop()
                          : void startRecording()
                      }
                    >
                      {recording ? <Square size={15} /> : <Mic size={15} />}
                      {recording ? "Stop recording" : "Record a voice report"}
                    </button>
                  )}
                  {recording && (
                    <p role="status">
                      Recording… Stop when you have finished your report.
                    </p>
                  )}
                </div>
              )}
              <div className="form-row">
                <LocationAutocomplete
                  label="Location or nearby landmark"
                  name="locationHint"
                  placeholder="e.g. Market Junction, Abuja"
                  value={locationHint}
                  onChange={(value) => {
                    setLocationHint(value);
                    setLocationPlaceId(undefined);
                  }}
                  onSelect={(place) => setLocationPlaceId(place.id)}
                  disabled={busy}
                />
                <label>
                  Time observed
                  <input
                    name="observedAt"
                    type="datetime-local"
                    disabled={busy}
                  />
                  <span className="field-help">
                    Use your local time; leave blank if unknown.
                  </span>
                </label>
              </div>
              <label>
                Source type
                <select
                  name="sourceType"
                  required
                  defaultValue=""
                  disabled={busy}
                >
                  <option value="" disabled>
                    Choose how you learned about this
                  </option>
                  {sourceTypes.map((type) => (
                    <option value={type} key={type}>
                      {label(type)}
                    </option>
                  ))}
                </select>
              </label>
              <details className="extra-details">
                <summary>Add source details or notes (optional)</summary>
                <label>
                  Original source or channel (optional)
                  <input
                    name="origin"
                    maxLength={150}
                    placeholder="e.g. personal observation, one community group"
                    disabled={busy}
                  />
                  <span className="field-help">
                    Use a general description. Do not include names, phone
                    numbers, or private group links.
                  </span>
                </label>
                <label>
                  Reporter notes (optional)
                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={1500}
                    placeholder="What are you certain about? What still needs checking?"
                    disabled={busy}
                  />
                </label>
              </details>
              <ErrorMessage message={error} />
              <button
                className="button submit-button"
                disabled={busy || recording}
                type="submit"
              >
                {busy ? "Saving and analyzing report…" : "Submit report"}
              </button>
              <p className="small-text">
                Reports are assessed alongside independent evidence. Submission
                does not confirm a claim.
              </p>
            </div>
          </form>
          {result && (
            <dialog
              ref={resultDialog}
              className="report-result-modal"
              aria-labelledby="report-result-title"
              aria-describedby="report-result-description"
              onClose={closeResult}
              onKeyDown={(event) => {
                if (event.key !== "Tab") return;
                const controls = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    "button:not([disabled]), a[href]",
                  ),
                );
                const first = controls[0];
                const last = controls.at(-1);
                const active = document.activeElement;
                if (
                  event.shiftKey &&
                  (active === first || active === resultHeading.current)
                ) {
                  event.preventDefault();
                  last?.focus();
                } else if (!event.shiftKey && active === last) {
                  event.preventDefault();
                  first?.focus();
                }
              }}
            >
              <header className="report-modal-header">
                <div className="row">
                  <span className="report-success-icon">
                    <CheckCircle2 size={23} />
                  </span>
                  <h2
                    id="report-result-title"
                    ref={resultHeading}
                    tabIndex={-1}
                  >
                    Report saved
                  </h2>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Close evidence review"
                  onClick={() => resultDialog.current?.close()}
                >
                  <X size={21} />
                </button>
              </header>
              <div className="report-modal-body result-panel">
                {result.report.analysisStatus !== "complete" ? (
                  <>
                    <p id="report-result-description">
                      Your report is stored, but analysis is{" "}
                      {result.report.analysisStatus}. It has not yet been added
                      to an incident.
                    </p>
                    {result.report.analysisError && (
                      <ErrorMessage message={result.report.analysisError} />
                    )}
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={retry}
                    >
                      {busy ? "Retrying analysis…" : "Retry analysis"}
                    </button>
                  </>
                ) : (
                  <p id="report-result-description">
                    Your report has been saved. Review the extracted evidence —
                    AI analysis can be incomplete or mistaken.
                  </p>
                )}
                <ErrorMessage message={error} />
                {extracted && (
                  <>
                    <dl className="facts two-column">
                      <div>
                        <dt>Incident type</dt>
                        <dd>{label(extracted.incidentType)}</dd>
                      </div>
                      <div>
                        <dt>Detected location</dt>
                        <dd>
                          {extracted.location.normalizedLabel ||
                            extracted.location.raw ||
                            "Unknown"}
                        </dd>
                      </div>
                      <div>
                        <dt>Observed time</dt>
                        <dd>
                          {extracted.observedAt
                            ? new Date(extracted.observedAt).toLocaleString()
                            : "Unknown"}
                        </dd>
                      </div>
                      <div>
                        <dt>Source perspective</dt>
                        <dd>{label(extracted.sourcePerspective)}</dd>
                      </div>
                      <div>
                        <dt>Language</dt>
                        <dd>{extracted.language}</dd>
                      </div>
                      <div>
                        <dt>Urgency</dt>
                        <dd>{label(extracted.urgency)}</dd>
                      </div>
                    </dl>
                    <h3>Normalized summary</h3>
                    <p className="generated-content">
                      {extracted.normalizedText}
                    </p>
                    {extracted.translatedText && (
                      <>
                        <h3>Translation</h3>
                        <p>{extracted.translatedText}</p>
                      </>
                    )}
                    <h3>Observed details</h3>
                    <ul>
                      {extracted.observations.map((o, n) => (
                        <li key={n}>{o}</li>
                      ))}
                    </ul>
                    <h3>Extracted claims</h3>
                    {extracted.claims.map((c, n) => (
                      <div key={n} className="extracted-claim">
                        <strong>{c.text}</strong>
                        <span>
                          {label(c.polarity)} · {label(c.perspective)}
                        </span>
                      </div>
                    ))}
                    {extracted.extractionNotes.length > 0 && (
                      <>
                        <h3>Analysis notes</h3>
                        <ul>
                          {extracted.extractionNotes.map((n, j) => (
                            <li key={j}>{n}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </>
                )}
                {result.incident && (
                  <div className="inset">
                    <div className="row wrap">
                      <StatusBadge status={result.incident.status} />
                      <strong>Matched incident</strong>
                    </div>
                    <h3>{result.incident.title}</h3>
                    <Link
                      className="button secondary"
                      href={`/incidents/${result.incident.id}`}
                    >
                      View incident evidence
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                )}
              </div>
              <footer className="report-modal-footer">
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => resultDialog.current?.close()}
                >
                  Close
                </button>
                <Link className="button" href="/">
                  Back to feed
                  <ArrowUpRight size={17} />
                </Link>
              </footer>
            </dialog>
          )}
        </div>
        <aside className="stack">
          <section className="panel guide-panel">
            <h2>Useful details make a difference.</h2>
            <ol>
              <li>
                <strong>Be specific.</strong>
                <p>
                  Describe the event, location, and time as clearly as possible.
                </p>
              </li>
              <li>
                <strong>Explain your perspective.</strong>
                <p>
                  Say whether you saw it yourself, heard it from someone, or
                  received a forwarded message.
                </p>
              </li>
              <li>
                <strong>Preserve uncertainty.</strong>
                <p>
                  Only share what you know. A repeated message may still have
                  one original source.
                </p>
              </li>
            </ol>
          </section>
          <div className="plain-note">
            <strong>Protect people’s privacy.</strong>
            <p>
              Avoid names, faces, phone numbers, and other identifying details.
              Do not put yourself at risk to gather evidence.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
