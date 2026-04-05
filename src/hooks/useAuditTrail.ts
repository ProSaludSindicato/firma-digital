import { useState, useCallback, useRef } from "react";

export type AuditEventType =
  | "document_opened"
  | "page_navigated"
  | "signature_area_clicked"
  | "signature_drawn"
  | "signature_uploaded"
  | "signature_positioned"
  | "signature_cleared"
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useAuditTrail = () => {
  const sessionId = useRef(generateId());
  const startedAt = useRef(new Date().toISOString());
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const summaryRef = useRef<AuditLog["summary"]>({
    documentName: null,
    totalPages: 0,
    signaturePage: null,
    signatureMethod: null,
    submittedAt: null,
    downloadedAt: null,
  });

  const trackEvent = useCallback(
    (type: AuditEventType, metadata?: Record<string, unknown>) => {
      const event: AuditEvent = {
        id: generateId(),
        type,
        timestamp: new Date().toISOString(),
        metadata,
      };

      setEvents((prev) => [...prev, event]);

      if (type === "document_opened" && metadata?.fileName) {
        summaryRef.current.documentName = metadata.fileName as string;
        summaryRef.current.totalPages = (metadata.totalPages as number) || 0;
      }
      if (type === "signature_drawn") {
        summaryRef.current.signatureMethod = "draw";
      }
      if (type === "signature_uploaded") {
        summaryRef.current.signatureMethod = "upload";
      }
      if (type === "signature_positioned" && metadata?.page) {
        summaryRef.current.signaturePage = metadata.page as number;
      }
      if (type === "document_confirmed") {
        summaryRef.current.submittedAt = event.timestamp;
      }
      if (type === "document_downloaded") {
        summaryRef.current.downloadedAt = event.timestamp;
      }

      return event;
    },
    [],
  );

  const getAuditLog = useCallback((): AuditLog => {
    return {
      sessionId: sessionId.current,
      startedAt: startedAt.current,
      events,
      summary: { ...summaryRef.current },
    };
  }, [events]);

  const resetAuditTrail = useCallback(() => {
    sessionId.current = generateId();
    startedAt.current = new Date().toISOString();
    setEvents([]);
    summaryRef.current = {
      documentName: null,
      totalPages: 0,
      signaturePage: null,
      signatureMethod: null,
      submittedAt: null,
      downloadedAt: null,
    };
  }, []);

  return {
    events,
    trackEvent,
    getAuditLog,
    resetAuditTrail,
    sessionId: sessionId.current,
  };
};
