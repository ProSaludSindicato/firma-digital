import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Send, CheckCircle, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFViewer, PDFViewerRef } from "@/components/PDFViewer";
import { AppTour } from "@/components/AppTour";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePDFSigner } from "@/hooks/usePDFSigner";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTour } from "@/hooks/useTour";
import { useIsLandscapeMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
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
import { pdfViewerConfig } from "@/lib/pdfViewerConfig";
import { appConfig } from "@/lib/appConfig";

const Index = () => {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const pdfViewerRef = useRef<PDFViewerRef>(null);

  const {
    pdfFile,
    signature,
    signaturePosition,
    totalPages,
    isDownloading,
    canDownload,
    handleFileSelect,
    handleSignatureCreate,
    handleClearSignature,
    setSignaturePosition,
    setTotalPages,
    downloadSignedPDF,
  } = usePDFSigner();

  const { trackEvent, getAuditLog } = useAuditTrail();
  const isLandscapeMobile = useIsLandscapeMobile();

  /* ─── Tour ───────────────────────────────────────────────────────────── */
  const tour = useTour();
  // Destructure stable callbacks so useEffect / useCallback deps don't change
  // on every render (the tour object reference is recreated each render).
  const { currentPhase: tourCurrentPhase, isPhaseShown, startPhase, endPhase, setRun: setTourRun } = tour;

  // When a PDF is loaded, continue the tour with viewer steps. Two cases:
  // 1) User uploads mid–welcome tour — welcome targets (e.g. #tour-upload-area) unmount;
  //    if we stayed on welcome, Joyride would keep a dark overlay with no valid target.
  // 2) Returning user who already finished welcome — start viewer tips once a file exists.
  useEffect(() => {
    if (!pdfFile) return;
    if (isPhaseShown('viewer')) return;
    if (tourCurrentPhase === 'viewer') return;

    const shouldStartViewer =
      tourCurrentPhase === 'welcome' ||
      (tourCurrentPhase === 'none' && isPhaseShown('welcome'));

    if (!shouldStartViewer) return;

    // Immediately stop any running tour so Joyride doesn't keep the dark overlay
    // while welcome targets (now unmounted) are still its active steps.
    setTourRun(false);

    const timer = setTimeout(() => startPhase('viewer'), 700);
    return () => clearTimeout(timer);
  }, [pdfFile, tourCurrentPhase, isPhaseShown, startPhase, setTourRun]);

  // Contextual trigger: start modal tips the first time the user opens the
  // signature modal (fired via onSignatureModalOpen from PDFViewer).
  const handleSignatureModalOpen = useCallback(() => {
    if (!isPhaseShown('modal')) {
      startPhase('modal');
    }
  }, [isPhaseShown, startPhase]);

  // Contextual trigger: start placed tips the first time a signature is set.
  useEffect(() => {
    if (!signature) return;
    if (isPhaseShown('placed')) return;

    const timer = setTimeout(() => startPhase('placed'), 600);
    return () => clearTimeout(timer);
  }, [signature, isPhaseShown, startPhase]);

  // Each phase ends on its own — no automatic chaining.
  const handleTourPhaseEnd = useCallback(() => {
    endPhase();
  }, [endPhase]);

  /* ─── Send flow ──────────────────────────────────────────────────────── */
  const handleFinishAndSend = () => {
    if (!signature) {
      pdfViewerRef.current?.activatePlacementMode();
    } else {
      setShowConfirmDialog(true);
    }
  };

  useKeyboardShortcuts(
    [
      {
        key: 's',
        ctrlKey: true,
        metaKey: true,
        handler: async () => {
          if (!isDownloading && !isSent) {
            handleFinishAndSend();
          } else if (isSent && !isDownloading) {
            try {
              await downloadSignedPDF();
            } catch {
              // Error handling is done in downloadSignedPDF
            }
          }
        },
        description: 'Colocar firma / Finalizar y enviar / Descargar',
      },
    ],
    !!pdfFile
  );

  const handleConfirmSend = async () => {
    try {
      trackEvent("document_submitted", {
        fileName: pdfFile?.name,
        signaturePage: signaturePosition?.page,
      });

      // TODO: Send audit log to backend via API
      const auditLog = getAuditLog();
      console.log("[AuditTrail] Document submitted:", JSON.stringify(auditLog, null, 2));

      setIsSent(true);
      setShowConfirmDialog(false);

      trackEvent("document_confirmed");

      toast({
        title: "Documento enviado",
        description: "Tu documento firmado ha sido enviado correctamente.",
        className: "bg-green-600 text-white border-green-700",
      });

      setTimeout(async () => {
        try {
          trackEvent("document_downloaded", { auto: true });
          await downloadSignedPDF();
        } catch (downloadError) {
          const errorMessage = downloadError instanceof Error
            ? downloadError.message
            : "Error al descargar el PDF";

          toast({
            title: "Error al descargar",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }, 500);
    } catch (error) {
      console.error("Error al enviar el convenio:", error);

      const errorMessage = error instanceof Error
        ? error.message
        : "Hubo un problema al enviar su convenio. Por favor, intente nuevamente.";

      toast({
        title: "Error al enviar el convenio",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      {/* Guided tour */}
      <AppTour
        phase={tourCurrentPhase}
        run={tour.run}
        stepIndex={tour.stepIndex}
        onStepChange={tour.setStepIndex}
        onPhaseEnd={handleTourPhaseEnd}
      />

      <Header
        showFinishButton={!!signature && !!signaturePosition}
        onFinish={handleFinishAndSend}
        isProcessing={isDownloading}
        isSent={isSent}
        title={appConfig.headerTitle}
      />

      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {!pdfFile ? (
          isLandscapeMobile ? (
            /* ── Landscape mobile: two-column layout ─────────────────── */
            <div
              className="flex-1 flex items-center gap-4 px-4 overflow-y-auto"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              {/* Left: title + steps */}
              <div className="flex flex-col justify-center gap-3 w-[38%] shrink-0 py-3">
                <div className="space-y-1">
                  <h1 className="text-lg font-bold text-foreground tracking-tight leading-tight">
                    Firma tu documento
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Sube tu PDF, coloca tu firma y descárgalo.
                  </p>
                </div>
                <div id="tour-steps-indicator" className="flex flex-col gap-1.5 text-xs text-muted-foreground/70">
                  {[
                    { n: 1, label: "Sube tu PDF" },
                    { n: 2, label: "Agrega tu firma" },
                    { n: 3, label: "Descarga" },
                  ].map(({ n, label }) => (
                    <span key={n} className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">{n}</span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: uploader */}
              <div id="tour-upload-area" className="flex-1 min-w-0 py-3">
                <PDFUploader onFileSelect={handleFileSelect} />
              </div>
            </div>
          ) : (
            /* ── Portrait / desktop: original vertical layout ────────── */
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6 gap-6 sm:gap-8">
                <div className="text-center max-w-2xl space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                    Firma tu documento
                  </h1>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Sube tu PDF, coloca tu firma y descárgalo listo para enviar.
                  </p>
                </div>

                <div id="tour-upload-area" className="w-full max-w-2xl">
                  <PDFUploader onFileSelect={handleFileSelect} />
                </div>

                <div id="tour-steps-indicator" className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground/70">
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">1</span>
                    Sube tu PDF
                  </span>
                  <div className="w-4 sm:w-6 h-px bg-border" />
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">2</span>
                    Agrega tu firma
                  </span>
                  <div className="w-4 sm:w-6 h-px bg-border" />
                  <span className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold">3</span>
                    Descarga
                  </span>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-hidden">
              <PDFViewer
                ref={pdfViewerRef}
                file={pdfFile}
                signature={signature}
                signaturePosition={signaturePosition}
                onSignaturePositionChange={setSignaturePosition}
                onSignatureCreate={handleSignatureCreate}
                onClearSignature={handleClearSignature}
                totalPages={totalPages}
                onTotalPagesChange={setTotalPages}
                isLocked={isSent}
                onTrackEvent={trackEvent}
                onSignatureModalOpen={handleSignatureModalOpen}
                scrollToSignaturePageOnLoad={pdfViewerConfig.scrollToSignaturePageOnLoad}
                signaturePageScrollDelayMs={pdfViewerConfig.signaturePageScrollDelayMs}
                continuousScroll={pdfViewerConfig.continuousScroll}
                signaturePageScrollBlock={pdfViewerConfig.signaturePageScrollBlock}
              />
            </div>

            {(() => {
              const completedSteps = isSent ? 3 : signature ? 2 : 1;
              const steps = [
                { label: "Abrir", done: completedSteps >= 1 },
                { label: "Firmar", done: completedSteps >= 2 },
                { label: "Enviar", done: completedSteps >= 3 },
              ];
              return (
                <div
                  className="shrink-0 w-full border-t border-border/40 bg-white z-50"
                  style={{ paddingBottom: "max(0.25rem, env(safe-area-inset-bottom))" }}
                >
                  {isSent ? (
                    <div className="flex flex-col items-center gap-2.5 px-4 py-3 max-w-md mx-auto">
                      <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-medium text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Documento enviado
                      </div>
                      <Button
                        onClick={() => {
                          trackEvent("document_downloaded", { auto: false });
                          downloadSignedPDF();
                        }}
                        disabled={isDownloading}
                        variant="outline"
                        size="sm"
                        className="w-full max-w-xs h-9"
                      >
                        <Download className="w-3.5 h-3.5 mr-1.5" />
                        {isDownloading ? "Procesando..." : "Descargar copia firmada"}
                      </Button>
                    </div>
                  ) : (
                    <div className={cn(
                      "max-w-lg mx-auto px-4",
                      isLandscapeMobile ? "py-1.5" : "py-2.5 md:py-3",
                    )}>
                      {!isLandscapeMobile && (
                        <div className="flex items-center justify-center gap-0 mb-2.5">
                          {steps.map((step, i) => (
                            <div key={step.label} className="flex items-center">
                              <div className="flex flex-col items-center gap-1">
                                <div
                                  className={cn(
                                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors",
                                    step.done
                                      ? "bg-primary text-primary-foreground"
                                      : "border border-border bg-muted/40 text-muted-foreground",
                                  )}
                                >
                                  {step.done ? (
                                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                  ) : (
                                    i + 1
                                  )}
                                </div>
                                <span className={cn(
                                  "text-[10px] font-medium leading-none",
                                  step.done ? "text-primary" : "text-muted-foreground/70",
                                )}>
                                  {step.label}
                                </span>
                              </div>
                              {i < steps.length - 1 && (
                                <div
                                  className={cn(
                                    "h-px w-10 sm:w-14 mx-2 transition-colors -translate-y-1.5",
                                    steps[i + 1].done ? "bg-primary" : "bg-border",
                                  )}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {signature ? (
                        <Button
                          id="tour-footer-action"
                          onClick={handleFinishAndSend}
                          disabled={isDownloading}
                          className={cn(
                            "w-full gap-2 rounded-full font-semibold shadow-sm",
                            isLandscapeMobile ? "h-8 text-xs" : "h-10 text-sm",
                          )}
                        >
                          <Send className="w-4 h-4" />
                          {isDownloading ? "Procesando..." : "Enviar documento firmado"}
                        </Button>
                      ) : !isLandscapeMobile ? (
                        <p className="text-center text-xs text-muted-foreground leading-relaxed">
                          Desplázate hasta la última página, toca donde quieras colocar tu firma y sigue el asistente.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-3 text-sm text-muted-foreground">
                <p>
                  Al enviar confirmas que la información es correcta y aceptas los términos del documento.
                </p>
                <div className="bg-muted/30 p-3 rounded-lg space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>Documento firmado digitalmente</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span>{new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}</span>
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  La firma quedará integrada al documento. Podrás descargar una copia.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Confirmar y enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
