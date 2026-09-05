import { describe, expect, it } from "vitest";
import { createViewerSteps } from "@/components/AppTour";

describe("createViewerSteps", () => {
  it("centers the document-area step on compact layout so the tooltip stays in the viewport", () => {
    const convenio = createViewerSteps("compact", "document-editor").at(-1);
    const classic = createViewerSteps("compact", "default").at(-1);

    expect(convenio?.target).toBe("body");
    expect(convenio?.placement).toBe("center");
    expect(classic?.target).toBe("body");
    expect(classic?.placement).toBe("center");
  });

  it("anchors the document-area step to the viewer on wide layout", () => {
    const steps = createViewerSteps("wide", "document-editor");
    const pdfArea = steps.at(-1);

    expect(pdfArea?.target).toBe("#tour-pdf-area");
    expect(pdfArea?.placement).toBe("right-start");
  });

  it("places the zoom tooltip above the dock bar on compact convenio layout", () => {
    const steps = createViewerSteps("compact", "document-editor");
    const zoom = steps.find((step) => step.target === "#tour-pdf-toolbar-zoom");

    expect(zoom?.placement).toBe("top");
  });

  it("places the zoom tooltip above the dock bar on wide convenio layout", () => {
    const steps = createViewerSteps("wide", "document-editor");
    const zoom = steps.find((step) => step.target === "#tour-pdf-toolbar-zoom");

    expect(zoom?.placement).toBe("top");
  });

  it("uses convenio-specific copy in viewer steps", () => {
    const intro = createViewerSteps("compact", "document-editor")[0];
    expect(intro.content).toContain("Firma aquí");
  });
});
