import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
} from "lucide-react";
import {
  DocumentEditorViewer,
  type DocumentEditorViewerRef,
} from "@/components/editor/DocumentEditorViewer";
import { EditorGuideBar } from "@/components/editor/EditorGuideBar";
import { EditorTour } from "@/components/editor/EditorTour";
import { Header } from "@/components/Header";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDocumentEditor } from "@/hooks/useDocumentEditor";
import { useEditorTour } from "@/hooks/useEditorTour";
import { useIsMobile } from "@/hooks/use-mobile";
import { appConfig } from "@/lib/appConfig";
import { apiFieldsToDocumentFields, FIELD_TYPE_LABELS } from "@/lib/fieldDefaults";
import {
  canFinishDocument,
  getFieldProgressCounts,
  getFinishDisabledTitle,
} from "@/lib/fieldValidation";
import { exportDocumentToPdf, exportedFileName } from "@/lib/pdfFieldExporter";
import { pdfViewerConfig } from "@/lib/pdfViewerConfig";
import {
  documentMetadataUrl,
  documentPdfUrl,
  documentSubmitUrl,
} from "@/lib/prosaludDocumentApi";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ApiDocumentField, EditorConstraints } from "@/types/documentEditor";

const GENERIC_INVALID_LINK_MESSAGE =
  "No pudimos verificar este enlace. Comprueba que copiaste la dirección completa o solicita un nuevo enlace válido.";

type DocumentMetadataPayload = {
  success: boolean;
  data?: {
    can_edit?: boolean;
    header_title?: string | null;
    document_name?: string;
    expires_at?: string | null;
    fields?: ApiDocumentField[];
    locked_placement?: boolean;
  };
  message?: string;
};

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-gradient-to-b from-muted/35 via-background to-background p-4 sm:p-8">
      <Card className="w-full max-w-md border-destructive/25 shadow-lg shadow-black/[0.04]">
        <CardHeader className="space-y-4 pb-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-destructive/10 text-destructive shadow-inner">
            <AlertCircle className="h-8 w-8" strokeWidth={1.65} />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            No pudimos abrir el enlace
          </h1>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </CardContent>
        <CardFooter className="border-t bg-muted/20 pt-5" />
      </Card>
    </div>
  );
}

const DocumentByToken = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("return_url");
  const isEmbedMode = searchParams.get("embed") === "1";
  const isMobile = useIsMobile();
  const editor = useDocumentEditor(isMobile);
  const { setFile, loadFields } = editor;
  const viewerRef = useRef<DocumentEditorViewerRef>(null);
  const signedPdfRef = useRef<Blob | null>(null);

  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [headerTitle, setHeaderTitle] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState<string>("");
  const [lockedPlacement, setLockedPlacement] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
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

  const pageSubtitle = useMemo(
    () => (totalPages > 0 ? `Página ${currentPage} de ${totalPages}` : undefined),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (!isEmbedMode || metaLoading || pdfLoading || metaError) {
      return;
    }

    window.parent.postMessage(
      {
        type: "editor-state",
        subtitle: pageSubtitle,
        progress: fieldProgress,
        finishDisabled,
        finishDisabledTitle,
        isSubmitting,
        isSent,
      },
      "*",
    );
  }, [
    isEmbedMode,
    metaLoading,
    pdfLoading,
    metaError,
    pageSubtitle,
    fieldProgress,
    finishDisabled,
    finishDisabledTitle,
    isSubmitting,
    isSent,
  ]);

  const editorTour = useEditorTour();
  const { run: tourRun, stepIndex: tourStepIndex, setStepIndex: setTourStepIndex, hasBeenShown: tourHasBeenShown, start: startEditorTour, end: endEditorTour } = editorTour;

  useEffect(() => {
    if (!editor.file) return;
    if (metaLoading || pdfLoading) return;
    if (metaError) return;
    if (isSent) return;
    if (tourHasBeenShown) return;
    if (tourRun) return;

    const timer = setTimeout(() => startEditorTour(), 700);
    return () => clearTimeout(timer);
  }, [
    editor.file,
    metaLoading,
    pdfLoading,
    metaError,
    isSent,
    tourHasBeenShown,
    tourRun,
    startEditorTour,
  ]);

  const handleEditorTourEnd = useCallback(() => {
    endEditorTour();
  }, [endEditorTour]);

  const pendingField = useMemo(
    () =>
      editor.incompleteRequiredFields[0]
        ? editor.incompleteRequiredFields[0].label ||
          FIELD_TYPE_LABELS[editor.incompleteRequiredFields[0].type]
        : undefined,
    [editor.incompleteRequiredFields],
  );

  const loadMetadataAndPdf = useCallback(async () => {
    if (!token) {
      setMetaError(GENERIC_INVALID_LINK_MESSAGE);
      setMetaLoading(false);
      return;
    }

    setMetaLoading(true);
    setMetaError(null);

    try {
      const metaRes = await fetch(documentMetadataUrl(token));
      let metaJson: DocumentMetadataPayload;
      try {
        metaJson = (await metaRes.json()) as DocumentMetadataPayload;
      } catch {
        setMetaError("No se pudo leer la respuesta del servidor.");
        setMetaLoading(false);
        return;
      }

      if (!metaRes.ok || !metaJson.success) {
        const fallback =
          metaRes.status === 404
            ? GENERIC_INVALID_LINK_MESSAGE
            : (metaJson.message ?? "No se pudo cargar la información del documento.");
        setMetaError(fallback);
        setMetaLoading(false);
        return;
      }

      const data = metaJson.data;
      const rawTitle =
        typeof data?.header_title === "string" ? data.header_title.trim() : "";
      setHeaderTitle(rawTitle !== "" ? rawTitle : null);
      setDocumentName(data?.document_name ?? "");
      setCanEdit(data?.can_edit !== false);

      if (data?.can_edit === false) {
        setMetaError(
          metaJson.message ??
            "Este enlace ya no está habilitado para editar el documento.",
        );
        setMetaLoading(false);
        return;
      }

      const incomingFields = Array.isArray(data?.fields) ? data.fields : [];
      const shouldLockPlacement =
        Boolean(data?.locked_placement) || incomingFields.length > 0;
      setLockedPlacement(shouldLockPlacement);

      setPdfLoading(true);
      const pdfRes = await fetch(documentPdfUrl(token));
      if (!pdfRes.ok) {
        setMetaError("No se pudo descargar el PDF del documento.");
        setPdfLoading(false);
        setMetaLoading(false);
        return;
      }

      const blob = await pdfRes.blob();
      const fileName = data?.document_name?.endsWith(".pdf")
        ? data.document_name
        : "documento.pdf";
      const file = new File([blob], fileName, { type: "application/pdf" });
      setFile(file);
      if (incomingFields.length > 0) {
        loadFields(apiFieldsToDocumentFields(incomingFields));
      }
      setPdfLoading(false);
    } catch {
      setMetaError("Error de conexión. Intenta nuevamente más tarde.");
    } finally {
      setMetaLoading(false);
    }
  }, [token, setFile, loadFields]);

  useEffect(() => {
    void loadMetadataAndPdf();
  }, [loadMetadataAndPdf]);

  const constraints: EditorConstraints = useMemo(
    () => ({
      showToolbar: !lockedPlacement,
      lockedPlacement,
    }),
    [lockedPlacement],
  );

  const handleFinish = useCallback(() => {
    if (editor.fields.length === 0) {
      toast.error("Agrega al menos un campo antes de enviar.");
      viewerRef.current?.activatePlacementMode();
      return;
    }
    if (editor.incompleteRequiredFields.length > 0) {
      const labels = editor.incompleteRequiredFields
        .map((field) => field.label || FIELD_TYPE_LABELS[field.type])
        .join(", ");
      toast.error(`Completa los campos obligatorios: ${labels}.`);
      return;
    }
    setShowConfirm(true);
  }, [editor.fields.length, editor.incompleteRequiredFields]);

  useEffect(() => {
    if (!isEmbedMode) {
      return undefined;
    }

    function handleParentMessage(event: MessageEvent) {
      if (event.data?.type === "request-submit") {
        handleFinish();
      }
    }

    window.addEventListener("message", handleParentMessage);

    return () => {
      window.removeEventListener("message", handleParentMessage);
    };
  }, [isEmbedMode, handleFinish]);

  const handleConfirmSubmit = async () => {
    if (!token || !canEdit || !editor.file) {
      return;
    }

    setIsSubmitting(true);
    try {
      const signedBlob = await exportDocumentToPdf(editor.file, editor.fields);
      const fd = new FormData();
      fd.append("pdf", signedBlob, exportedFileName(editor.file.name));
      if (returnUrl) {
        fd.append("return_url", returnUrl);
      }

      const res = await fetch(documentSubmitUrl(token), {
        method: "POST",
        body: fd,
      });

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        redirect_url?: string;
      };
      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "No se pudo enviar el documento.");
      }

      setIsSent(true);
      setShowConfirm(false);
      signedPdfRef.current = signedBlob;
      if (!isEmbedMode) {
        toast.success("Documento enviado correctamente.");
      }

      const resolvedRedirectUrl = json.redirect_url ?? returnUrl;

      if (isEmbedMode) {
        window.parent.postMessage(
          {
            type: "document-signed",
            token,
          },
          "*",
        );
      } else if (resolvedRedirectUrl) {
        window.setTimeout(() => {
          window.location.href = resolvedRedirectUrl;
        }, 1200);
      }

      window.setTimeout(() => {
        if (isEmbedMode) {
          return;
        }

        try {
          const url = URL.createObjectURL(signedBlob);
          const link = document.createElement("a");
          link.href = url;
          link.download = exportedFileName(editor.file?.name ?? "documento.pdf");
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch {
          toast.error("El envío se completó, pero no se pudo descargar la copia.");
        }
      }, 400);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error al enviar el documento.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualDownload = useCallback(() => {
    const blob = signedPdfRef.current;
    if (!blob) {
      toast.error("No hay un archivo para descargar.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = exportedFileName(editor.file?.name ?? "documento.pdf");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [editor.file]);

  const resolvedTitle = headerTitle ?? appConfig.documentHeaderTitle;
  const rootClassName = isEmbedMode
    ? "flex h-full flex-col overflow-hidden bg-background"
    : "flex h-dvh flex-col overflow-hidden bg-background";

  return (
    <div className={rootClassName}>
      {!token ? (
        <ErrorPanel message={GENERIC_INVALID_LINK_MESSAGE} />
      ) : metaLoading || pdfLoading ? (
        <>
          {!isEmbedMode && (
            <Header
              showFinishButton={false}
              isProcessing
              isSent={false}
              title={resolvedTitle}
            />
          )}
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando documento…</p>
          </div>
        </>
      ) : metaError ? (
        <ErrorPanel message={metaError} />
      ) : (
        <>
          {!isEmbedMode && (
            <Header
              variant="document"
              showDocumentIcon
              title={resolvedTitle}
              subtitle={pageSubtitle}
              fieldProgress={fieldProgress}
              finishDisabled={finishDisabled}
              finishDisabledTitle={finishDisabledTitle}
              showFinishButton={!isSent}
              onFinish={handleFinish}
              isProcessing={isSubmitting}
              isSent={isSent}
              finishLabel="Enviar documento"
            />
          )}
          {!isEmbedMode && isSent ? (
            <div className="flex shrink-0 items-center justify-center gap-1.5 border-b border-green-200/60 bg-green-50 px-4 py-2 text-xs font-medium text-green-700 sm:text-sm">
              <CheckCircle className="h-4 w-4 shrink-0" />
              Documento enviado correctamente
              <button
                type="button"
                onClick={handleManualDownload}
                className="ml-1 underline underline-offset-2 hover:text-green-800"
              >
                Descargar copia
              </button>
            </div>
          ) : !isSent ? (
            <EditorGuideBar
              showDefaultHint={!lockedPlacement}
              placingType={lockedPlacement ? null : editor.placingType}
              lockedPlacement={lockedPlacement}
              pendingFieldLabel={pendingField}
              isOnConstrainedPage
              onCancel={() => editor.setPlacingType(null)}
              onNavigate={() => viewerRef.current?.goToConstrainedPage()}
            />
          ) : null}
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {editor.file ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <DocumentEditorViewer
                  ref={viewerRef}
                  file={editor.file}
                  fields={editor.fields}
                  activeFieldId={editor.activeFieldId}
                  placingType={editor.placingType}
                  constraints={constraints}
                  isLocked={isSent}
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
            ) : null}
          </main>
        </>
      )}

      {editor.file && !metaError && !isSent ? (
        <EditorTour
          run={tourRun}
          stepIndex={tourStepIndex}
          lockedPlacement={lockedPlacement}
          onStepChange={setTourStepIndex}
          onEnd={handleEditorTourEnd}
        />
      ) : null}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Al confirmar, se enviará el PDF con los campos diligenciados al
              sistema de origen. Esta acción no se puede deshacer desde aquí.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={() => void handleConfirmSubmit()}
              className={cn("gap-2")}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Confirmar envío
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentByToken;
