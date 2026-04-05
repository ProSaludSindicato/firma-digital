import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Send, CheckCircle, PenLine, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { PDFUploader } from "@/components/PDFUploader";
import { PDFViewer, PDFViewerRef } from "@/components/PDFViewer";
import { AppTour } from "@/components/AppTour";
import { Button } from "@/components/ui/button";
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
        description: 'Ingresar firma / Finalizar y enviar / Descargar',
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
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-0">
            <div className="text-center max-w-2xl space-y-2 mb-6 sm:mb-8 flex-shrink-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Firma tu documento
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sube tu PDF, coloca tu firma y descárgalo listo para enviar.
              </p>
            </div>

            <div id="tour-upload-area" className="w-full max-w-2xl flex-shrink-0 mb-6 sm:mb-8">
              <PDFUploader onFileSelect={handleFileSelect} />
            </div>

            <div id="tour-steps-indicator" className="flex items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground/70 flex-shrink-0">
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
              />
            </div>

            {(() => {
              const completedSteps = isSent ? 3 : signature ? 2 : 1;
              return (
                <div
                  className="flex-shrink-0 w-full bg-background/95 backdrop-blur-sm border-t border-border/50 z-50"
                  style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
                >
                  <div className={`flex flex-col items-center max-w-lg mx-auto px-3 ${isLandscapeMobile ? "gap-1 py-1" : "gap-1.5 py-2 md:py-2.5"}`}>
                    {isSent ? (
                      <>
                        {!isLandscapeMobile && (
                          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Documento enviado correctamente
                          </div>
                        )}
                        <Button onClick={() => {
                          trackEvent("document_downloaded", { auto: false });
                          downloadSignedPDF();
                        }} disabled={isDownloading} className={`w-full ${isLandscapeMobile ? "h-8" : "h-9"}`} size="sm">
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          {isDownloading ? "Procesando..." : "Descargar copia firmada"}
                        </Button>
                      </>
                    ) : (
                      <>
                        {!isLandscapeMobile && (
                          <div className="flex items-center gap-1.5 w-full">
                            <div className="flex items-center gap-0.5 flex-1">
                              {[1, 2, 3].map((s) => (
                                <div
                                  key={s}
                                  className={`h-0.5 rounded-full flex-1 transition-all duration-300 ${
                                    s <= completedSteps ? "bg-primary" : "bg-border"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                              {completedSteps} de 3
                            </span>
                          </div>
                        )}

                        <Button
                          id="tour-footer-action"
                          onClick={handleFinishAndSend}
                          disabled={isDownloading}
                          className={`w-full ${isLandscapeMobile ? "h-8" : "h-9"}`}
                          size="sm"
                        >
                          {signature ? (
                            <>
                              <Send className="w-3.5 h-3.5 mr-1.5" />
                              {isDownloading ? "Procesando..." : "Enviar documento firmado"}
                            </>
                          ) : (
                            <>
                              <PenLine className="w-3.5 h-3.5 mr-1.5" />
                              Agregar firma
                            </>
                          )}
                        </Button>

                        {!isLandscapeMobile && (
                          <p className="text-[10px] text-muted-foreground/50 text-center leading-tight">
                            {!signature ? "Navega al área de firma y haz clic para firmar" : "Revisa tu firma y envía el documento"}
                          </p>
                        )}
                      </>
                    )}
                  </div>
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
