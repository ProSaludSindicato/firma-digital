import { useState, useCallback, useRef } from "react";

export type AuditEventType =
  | "document_opened"
  | "page_navigated"
  | "signature_area_clicked"
  | "signature_drawn"
  | "signature_uploaded"
  | "signature_positioned"
  | "signature_cleared"
  | "terms_accepted"
  | "document_submitted"
  | "document_confirmed"
  | "document_downloaded";

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  sessionId: string;
  startedAt: string;
  events: AuditEvent[];
  summary: {
    documentName: string | null;
    totalPages: number;
    signaturePage: number | null;
    signatureMethod: "draw" | "upload" | null;
    submittedAt: string | null;
    downloadedAt: string | null;
  };
}

export const emptyAuditSummary = (): AuditLog["summary"] => ({
  documentName: null,
  totalPages: 0,
  signaturePage: null,
  signatureMethod: null,
  submittedAt: null,
  downloadedAt: null,
});

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function applyAuditEventToSummary(
  summary: AuditLog["summary"],
  type: AuditEventType,
  metadata: Record<string, unknown> | undefined,
  timestamp: string,
): AuditLog["summary"] {
  const next = { ...summary };

  if (type === "document_opened" && typeof metadata?.fileName === "string") {
    next.documentName = metadata.fileName;
  }

  const totalPages = asFiniteNumber(metadata?.totalPages);
  if (totalPages !== null && totalPages > 0) {
    next.totalPages = totalPages;
  }

  if (type === "signature_drawn") {
    next.signatureMethod = "draw";
  }
  if (type === "signature_uploaded") {
    next.signatureMethod = "upload";
  }
  if (type === "signature_cleared") {
    next.signatureMethod = null;
  }

  if (type === "signature_positioned" || type === "document_submitted") {
    const page = asFiniteNumber(metadata?.page) ?? asFiniteNumber(metadata?.signaturePage);
    if (page !== null && page > 0) {
      next.signaturePage = page;
    }
  }

  if (type === "document_submitted" || type === "document_confirmed") {
    next.submittedAt = timestamp;
  }
  if (type === "document_downloaded") {
    next.downloadedAt = timestamp;
  }

  return next;
}

export const useAuditTrail = () => {
  const sessionId = useRef(generateId());
  const startedAt = useRef(new Date().toISOString());
  const eventsRef = useRef<AuditEvent[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const summaryRef = useRef<AuditLog["summary"]>(emptyAuditSummary());

  const trackEvent = useCallback(
    (type: AuditEventType, metadata?: Record<string, unknown>) => {
      const event: AuditEvent = {
        id: generateId(),
        type,
        timestamp: new Date().toISOString(),
        metadata,
      };

      eventsRef.current = [...eventsRef.current, event];
      setEvents(eventsRef.current);
      summaryRef.current = applyAuditEventToSummary(
        summaryRef.current,
        type,
        metadata,
        event.timestamp,
      );

      return event;
    },
    [],
  );

  const getAuditLog = useCallback((): AuditLog => {
    return {
      sessionId: sessionId.current,
      startedAt: startedAt.current,
      events: [...eventsRef.current],
      summary: { ...summaryRef.current },
    };
  }, []);

  const resetAuditTrail = useCallback(() => {
    sessionId.current = generateId();
    startedAt.current = new Date().toISOString();
    eventsRef.current = [];
    setEvents([]);
    summaryRef.current = emptyAuditSummary();
  }, []);

  return {
    events,
    trackEvent,
    getAuditLog,
    resetAuditTrail,
    sessionId: sessionId.current,
  };
};
