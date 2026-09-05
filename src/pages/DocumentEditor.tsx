import { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { DocumentEditorViewer } from "@/components/editor/DocumentEditorViewer";
import { EditorGuideBar } from "@/components/editor/EditorGuideBar";
import { EditorTour } from "@/components/editor/EditorTour";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { useDocumentEditor } from "@/hooks/useDocumentEditor";
import { useEditorTour } from "@/hooks/useEditorTour";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { appConfig } from "@/lib/appConfig";
import { FIELD_TYPE_LABELS } from "@/lib/fieldDefaults";
import {
  canFinishDocument,
  getFieldProgressCounts,
  getFinishDisabledTitle,
} from "@/lib/fieldValidation";
import {
  exportedFileName,
  exportDocumentToPdf,
} from "@/lib/pdfFieldExporter";
import { pdfViewerConfig } from "@/lib/pdfViewerConfig";

const DocumentEditorPage = () => {
  const isMobile = useIsMobile();
  const editor = useDocumentEditor(isMobile);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fieldProgress = useMemo(
    () => getFieldProgressCounts(editor.fields),
    [editor.fields],
  );
  const finishDisabledTitle = useMemo(
    () => getFinishDisabledTitle(editor.fields),
    [editor.fields],
  );
  const finishDisabled = !canFinishDocument(editor.fields);

  const editorTour = useEditorTour();
  const {
    run: tourRun,
    stepIndex: tourStepIndex,
    setStepIndex: setTourStepIndex,
    canAutoStart: canAutoStartTourForContext,
    start: startEditorTour,
    end: endEditorTour,
  } = editorTour;

  const tourContextKey = editor.file?.name ?? null;

  useEffect(() => {
    if (!editor.file) return;
    if (!tourContextKey) return;
    if (!canAutoStartTourForContext(tourContextKey)) return;
    if (tourRun) return;

    const timer = setTimeout(() => {
      if (canAutoStartTourForContext(tourContextKey)) {
        startEditorTour();
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [editor.file, tourContextKey, canAutoStartTourForContext, tourRun, startEditorTour]);

  const handleEditorTourEnd = useCallback(() => {
    endEditorTour(tourContextKey ?? undefined);
  }, [endEditorTour, tourContextKey]);

  const documentTitle = editor.file
    ? editor.file.name.replace(/\.pdf$/i, "")
    : appConfig.editorHeaderTitle;

  const handleDownload = useCallback(async () => {
    if (!editor.file) {
      return;
    }

    if (editor.fields.length === 0) {
      toast({
        title: "Agrega al menos un campo",
        description:
          "Selecciona un tipo de campo en la barra y tócalo sobre el documento.",
        variant: "destructive",
      });
      return;
    }

    if (editor.incompleteRequiredFields.length > 0) {
      const labels = editor.incompleteRequiredFields
        .map((field) => field.label || FIELD_TYPE_LABELS[field.type])
        .join(", ");
      toast({
        title: "Campos pendientes",
        description: `Completa los campos obligatorios: ${labels}.`,
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportDocumentToPdf(editor.file, editor.fields);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportedFileName(editor.file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast({
        title: "Documento listo",
        description: "La descarga del PDF completado comenzó.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo generar el PDF.";
      toast({
        title: "Error al exportar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [editor.file, editor.fields, editor.incompleteRequiredFields]);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <Header
        variant={editor.file ? "document" : "default"}
        showDocumentIcon={Boolean(editor.file)}
        title={documentTitle}
        subtitle={
          editor.file && totalPages > 0
            ? `Página ${currentPage} de ${totalPages}`
            : undefined
        }
        fieldProgress={editor.file ? fieldProgress : undefined}
        showFinishButton={Boolean(editor.file)}
        finishDisabled={finishDisabled}
        finishDisabledTitle={finishDisabledTitle}
        onFinish={() => void handleDownload()}
        isProcessing={isExporting}
        finishLabel="Descargar"
        finishIcon={<Download className="h-4 w-4 sm:h-5 sm:w-5" />}
      />

      {editor.file ? (
        <EditorGuideBar
          placingType={editor.placingType}
          onCancel={() => editor.setPlacingType(null)}
        />
      ) : null}

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!editor.file ? (
          <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8">
            <div className="mb-6 max-w-lg space-y-2 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Editor de documentos
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Sube un PDF, coloca campos de firma, texto, número, fecha o casillas
                donde los necesites, complétalos y descarga el resultado.
              </p>
            </div>
            <div className="w-full max-w-2xl">
              <PDFUploader onFileSelect={editor.setFile} />
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden">
            <DocumentEditorViewer
              file={editor.file}
              fields={editor.fields}
              activeFieldId={editor.activeFieldId}
              placingType={editor.placingType}
              isLocked={false}
              continuousScroll={pdfViewerConfig.continuousScroll}
              onSelectField={editor.selectField}
              onUpdateField={editor.updateField}
              onRemoveField={editor.removeField}
              onChangeValue={editor.setValue}
              onPlaceField={editor.addFieldAt}
              onSetPlacingType={editor.setPlacingType}
              onUndoLastField={editor.undoLastField}
              onCurrentPageChange={setCurrentPage}
              onTotalPagesChange={setTotalPages}
            />
          </div>
        )}
      </main>

      {editor.file ? (
        <EditorTour
          run={tourRun}
          stepIndex={tourStepIndex}
          lockedPlacement={false}
          onStepChange={setTourStepIndex}
          onEnd={handleEditorTourEnd}
        />
      ) : null}
    </div>
  );
};

export default DocumentEditorPage;
