import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { applyAuditEventToSummary, emptyAuditSummary, useAuditTrail } from "./useAuditTrail";
import type { AuditLog } from "./useAuditTrail";

describe("applyAuditEventToSummary", () => {
  it("records document metadata, signature method, page and submit time", () => {
    let summary = emptyAuditSummary();
    summary = applyAuditEventToSummary(
      summary,
      "document_opened",
      { fileName: "convenio.pdf", totalPages: 4 },
      "2026-09-02T15:00:00.000Z",
    );
    summary = applyAuditEventToSummary(
      summary,
      "signature_drawn",
      undefined,
      "2026-09-02T15:01:00.000Z",
    );
    summary = applyAuditEventToSummary(
      summary,
      "document_submitted",
      { signaturePage: 4 },
      "2026-09-02T15:02:00.000Z",
    );

    expect(summary).toMatchObject({
      documentName: "convenio.pdf",
      totalPages: 4,
      signaturePage: 4,
      signatureMethod: "draw",
      submittedAt: "2026-09-02T15:02:00.000Z",
    });
  });

  it("clears the signature method when the signature is removed", () => {
    let summary = applyAuditEventToSummary(
      emptyAuditSummary(),
      "signature_uploaded",
      undefined,
      "2026-09-02T15:01:00.000Z",
    );
    summary = applyAuditEventToSummary(
      summary,
      "signature_cleared",
      undefined,
      "2026-09-02T15:01:30.000Z",
    );

    expect(summary.signatureMethod).toBeNull();
  });
});

describe("useAuditTrail", () => {
  it("includes an event recorded immediately before getAuditLog", () => {
    const { result } = renderHook(() => useAuditTrail());
    let log: AuditLog | undefined;

    act(() => {
      result.current.trackEvent("document_opened", {
        fileName: "convenio.pdf",
        totalPages: 3,
      });
    });

    act(() => {
      result.current.trackEvent("signature_positioned", { page: 3 });
      result.current.trackEvent("signature_drawn");
      result.current.trackEvent("terms_accepted");
      result.current.trackEvent("document_submitted", { signaturePage: 3 });
      log = result.current.getAuditLog();
    });

    expect(log?.events.map((event) => event.type)).toEqual([
      "document_opened",
      "signature_positioned",
      "signature_drawn",
      "terms_accepted",
      "document_submitted",
    ]);
    expect(log?.summary).toMatchObject({
      documentName: "convenio.pdf",
      totalPages: 3,
      signaturePage: 3,
      signatureMethod: "draw",
    });
    expect(log?.summary.submittedAt).toEqual(expect.any(String));
  });
});
