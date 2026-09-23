export const statuses = [
  "unverified",
  "emerging",
  "corroborated",
  "conflicting",
  "stale",
  "resolved",
] as const;
export type Status = (typeof statuses)[number];
export const severities = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof severities)[number];
export const incidentTypes = [
  "road_blockage",
  "violence",
  "gunshots",
  "fire",
  "accident",
  "protest",
  "security_presence",
  "suspicious_activity",
  "infrastructure_failure",
  "other",
] as const;
export type IncidentType = (typeof incidentTypes)[number];
export const sourceTypes = [
  "eyewitness",
  "second-hand",
  "community member",
  "trusted community source",
  "security/vigilante source",
  "official source",
  "anonymous/unknown",
] as const;
export type SourceType = (typeof sourceTypes)[number];
export type Perspective = "firsthand" | "secondhand" | "forwarded" | "unknown";
export type Location = {
  raw: string | null;
  normalizedLabel: string | null;
  latitude: number | null;
  longitude: number | null;
};
export type NormalizedReport = {
  language: string;
  translatedText: string | null;
  normalizedText: string;
  incidentType: IncidentType;
  location: Location;
  observedAt: string | null;
  sourcePerspective: Perspective;
  observations: string[];
  claims: {
    text: string;
    category: string;
    polarity: "supports" | "denies" | "uncertain";
    perspective: Perspective;
  }[];
  urgency: Severity;
  extractionNotes: string[];
};
export type ReportInput = {
  text: string;
  locationHint: string;
  locationPlaceId?: string;
  sourceType: SourceType;
  observedAt: string | null;
  notes: string;
  origin: string;
  inputType: "text" | "audio" | "image" | "screenshot";
};
export type Report = {
  id: string;
  incidentId: string | null;
  rawText: string;
  normalized: NormalizedReport | null;
  sourceType: SourceType;
  sourceFingerprint: string;
  independenceGroup: string;
  origin: string;
  submittedAt: string;
  observedAt: string;
  inputType: ReportInput["inputType"];
  mediaPath: string | null;
  analysisStatus: "pending" | "complete" | "failed";
  analysisError: string | null;
  notes: string;
  locationHint: string;
  locationPlaceId?: string;
  explicitObservedAt?: string | null;
};
export type Claim = {
  id: string;
  incidentId: string;
  reportId: string;
  canonicalText: string;
  category: string;
  stance: "support" | "deny" | "uncertain";
  firsthandness: Perspective;
  createdAt: string;
};
export type ClaimRelation = {
  id: string;
  claimAId: string;
  claimBId: string;
  relation: "supports" | "contradicts" | "updates";
  explanation: string;
  createdAt: string;
};
export type Incident = {
  isDemo?: boolean;
  id: string;
  title: string;
  incidentType: IncidentType;
  status: Status;
  severity: Severity;
  summary: string;
  location: Location;
  firstReportedAt: string;
  lastReportedAt: string;
  lastCorroboratedAt: string | null;
  statusUpdatedAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};
export type StatusHistory = {
  id: string;
  incidentId: string;
  previousStatus: Status | null;
  newStatus: Status;
  reason: string[];
  createdAt: string;
};
export type GeneratedAlert = {
  id: string;
  incidentId: string;
  format: string;
  language: string;
  content: string;
  createdAt: string;
};
export type VerificationRequest = {
  id: string;
  incidentId: string;
  content: string;
  createdAt: string;
};
export type Store = {
  incidents: Incident[];
  reports: Report[];
  claims: Claim[];
  relations: ClaimRelation[];
  history: StatusHistory[];
  alerts: GeneratedAlert[];
  verifications: VerificationRequest[];
};
export type PublicReport = {
  id: string;
  sourceType: SourceType;
  inputType: Report["inputType"];
  perspective: Perspective;
  observedAt: string;
  submittedAt: string;
  summary: string;
  language: string;
  duplicate: boolean;
};
export type ClaimView = {
  id: string;
  text: string;
  category: string;
  status: Status;
  supportingSources: number;
  denyingSources: number;
  uncertainSources: number;
  reports: {
    reportId: string;
    sourceType: SourceType;
    stance: Claim["stance"];
    perspective: Perspective;
    observedAt: string;
  }[];
};
export type IncidentView = Incident & {
  reportCount: number;
  independentSourceCount: number;
  supportingReports: number;
  contradictingReports: number;
  firsthandCount: number;
  explanation: string[];
  verificationRecommendation: string;
  claims: ClaimView[];
  reports: PublicReport[];
  timeline: StatusHistory[];
  relations: ClaimRelation[];
};
export type Dashboard = {
  incidents: IncidentView[];
  metrics: {
    active: number;
    corroborated: number;
    emerging: number;
    conflicting: number;
    stale: number;
    highSeverity: number;
    reportsLastHour: number;
  };
  demoMode: boolean;
  coordinator: boolean;
};
export type AssistantResult = {
  answer: string;
  citations: {
    incidentId: string;
    title: string;
    status: Status;
    lastReportedAt: string;
  }[];
  mode: "ai" | "demo" | "evidence-fallback";
};
export type RouteResult = {
  state: "no_known_active_signal" | "caution" | "impacted" | "uncertain";
  summary: string;
  geometry: [number, number][];
  origin: string;
  destination: string;
  distanceMeters: number;
  durationSeconds: number;
  incidents: { incident: IncidentView; distanceMeters: number }[];
  alternatives: {
    geometry: [number, number][];
    distanceMeters: number;
    durationSeconds: number;
  }[];
  unlocatedCount: number;
};
