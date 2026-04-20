import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Check,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  Send,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AppTour } from "@/components/AppTour";
import { Header } from "@/components/Header";
import { PDFViewer, PDFViewerRef } from "@/components/PDFViewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { usePDFSigner } from "@/hooks/usePDFSigner";
import { useTour } from "@/hooks/useTour";
import { useIsLandscapeMobile } from "@/hooks/use-mobile";
import { appConfig } from "@/lib/appConfig";
import { pdfViewerConfig } from "@/lib/pdfViewerConfig";
import {
  convenioFirmaDocumentUrl,
  convenioFirmaMetadataUrl,
  convenioFirmaSubmitUrl,
} from "@/lib/prosaludConvenioApi";
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
import { toast } from "sonner";

const AFFILIATE_HELP_EMAIL = "auxiliar.talento@sindicatoprosalud.com";

const GENERIC_INVALID_OR_MISSING_LINK_MESSAGE =
  "No pudimos verificar este enlace. Comprueba que copiaste la dirección completa o solicita un nuevo correo con un enlace válido.";

type MetadataPayload = {
  success: boolean;
  data?: {
    signing_estado?: string | null;
    can_sign?: boolean;
    nombre_afiliado?: string;
    nombre_convenio?: string;
    expires_at?: string | null;
    /** Título de cabecera del visor (viene del backend). */
    header_title?: string | null;
    firmado_afiliado_at?: string | null;
    firmado_presidente_at?: string | null;
    rechazado_at?: string | null;
    motivo_rechazo?: string | null;
  };
  message?: string;
};

type BlockedSigningKind = "firmado_afiliado" | "completado" | "rechazado" | "expirado" | "otro";

function formatLocaleDateTime(iso: string | null | undefined): string | undefined {
  if (!iso) {
    return undefined;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
}

function resolveBlockedSigningKind(signingEstado: string | null | undefined): BlockedSigningKind {
  switch (signingEstado) {
    case "firmado_afiliado":
      return "firmado_afiliado";
    case "completado":
      return "firmado_afiliado";
    case "rechazado":
      return "rechazado";
    case "pendiente_firma":
      return "expirado";
    default:
      return "otro";
  }
}

function HelpEmailFooter({ className }: { className?: string }) {
  return (
    <p className={cn("text-[11px] sm:text-xs text-muted-foreground leading-relaxed text-center", className)}>
      ¿Necesitas ayuda?{" "}
      <a
        href={`mailto:${AFFILIATE_HELP_EMAIL}`}
        className="text-primary font-medium underline-offset-4 hover:underline"
      >
        {AFFILIATE_HELP_EMAIL}
      </a>
    </p>
  );
}

function StatusIconBadge({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 shadow-inner",
        className,
      )}
    >
      <Icon className="h-8 w-8" strokeWidth={1.65} />
    </div>
  );
}

type ConvenioCannotSignPanelProps = {
  blockedKind: BlockedSigningKind;
  affiliateName: string;
  convenioName: string;
  firmadoAfiliadoAt: string | null;
  firmadoPresidenteAt: string | null;
  rechazadoAt: string | null;
  motivoRechazo: string | null;
  expiresAt: string | null;
};

function ConvenioCannotSignPanel({
  blockedKind,
  affiliateName,
  convenioName,
  firmadoAfiliadoAt,
  firmadoPresidenteAt,
  rechazadoAt,
  motivoRechazo,
  expiresAt,
}: ConvenioCannotSignPanelProps) {
  const firmadoAfiliadoLabel = formatLocaleDateTime(firmadoAfiliadoAt);
  const firmadoPresidenteLabel = formatLocaleDateTime(firmadoPresidenteAt);
  const rechazadoLabel = formatLocaleDateTime(rechazadoAt);
  const expiresLabel = formatLocaleDateTime(expiresAt);

  let icon: LucideIcon;
  let badgeClass: string;
  let title: string;
  let description: string;

  switch (blockedKind) {
    case "firmado_afiliado":
      icon = BadgeCheck;
      badgeClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/15";
      title = "Tu firma ya fue recibida";
      description =
        "ProSalud registró correctamente el convenio que enviaste. Puedes usar esta pantalla para confirmar que el envío se completó.";
      break;
    case "rechazado":
      icon = Ban;
      badgeClass = "bg-destructive/10 text-destructive";
      title = "Este convenio no puede continuar";
      description =
        "El trámite asociado a este enlace fue rechazado. Si tienes dudas, escríbenos con tu documento de identidad a mano.";
      break;
    case "expirado":
      icon = Clock;
      badgeClass = "bg-amber-500/10 text-amber-800 dark:text-amber-400 dark:bg-amber-500/15";
      title = "Este enlace expiró";
      description =
        "Por seguridad, los enlaces de firma tienen vigencia limitada. Solicita un nuevo correo con un enlace actualizado para poder firmar.";
      break;
    default:
      icon = AlertCircle;
      badgeClass = "bg-muted text-muted-foreground";
      title = "No puedes firmar con este enlace";
      description =
        "Este enlace ya no está habilitado para registrar la firma. Si crees que es un error, contáctanos y te orientamos.";
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 min-h-0 overflow-y-auto bg-gradient-to-b from-muted/35 via-background to-background">
      <Card className="w-full max-w-md border-border/80 shadow-lg shadow-black/[0.04]">
        <CardHeader className="space-y-4 text-center pb-2 sm:pb-4">
          <StatusIconBadge icon={icon} className={badgeClass} />
          <div className="space-y-2">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-center text-sm">
          {affiliateName ? (
            <p className="font-medium text-foreground">
              <span className="text-muted-foreground font-normal">Afiliado/a: </span>
              {affiliateName}
            </p>
          ) : null}
          {convenioName ? (
            <p className="text-muted-foreground text-xs sm:text-sm">
              <span className="font-medium text-foreground/90">Convenio: </span>
              {convenioName}
            </p>
          ) : null}

          {blockedKind === "firmado_afiliado" && firmadoAfiliadoLabel ? (
            <div className="rounded-xl border border-emerald-300/70 bg-emerald-100/45 px-4 py-3 text-left text-xs sm:text-sm dark:border-emerald-700/50 dark:bg-emerald-950/30">
              <p className="text-emerald-900/95 dark:text-emerald-200/95 font-medium text-[11px] uppercase tracking-wide">
                Registro de envío
              </p>
              <p className="text-foreground mt-1">{firmadoAfiliadoLabel}</p>
            </div>
          ) : null}

          {blockedKind === "rechazado" && (motivoRechazo?.trim() || rechazadoLabel) ? (
            <div className="rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3 text-left text-xs sm:text-sm space-y-2">
              {motivoRechazo?.trim() ? <p className="text-foreground">{motivoRechazo.trim()}</p> : null}
              {rechazadoLabel ? (
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground/80">Registro: </span>
                  {rechazadoLabel}
                </p>
              ) : null}
            </div>
          ) : null}

          {blockedKind === "expirado" && expiresLabel ? (
            <p className="text-xs text-muted-foreground">
              Fecha de vencimiento del enlace: <span className="text-foreground font-medium">{expiresLabel}</span>
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col border-t bg-muted/20 pt-5">
          <HelpEmailFooter />
        </CardFooter>
      </Card>
    </div>
  );
}

function ConvenioGenericErrorPanel({ message }: { message: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 min-h-0 overflow-y-auto bg-gradient-to-b from-muted/35 via-background to-background">
      <Card className="w-full max-w-md border-destructive/25 shadow-lg shadow-black/[0.04]">
        <CardHeader className="space-y-4 text-center pb-2">
          <StatusIconBadge icon={AlertCircle} className="bg-destructive/10 text-destructive" />
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">No pudimos abrir el enlace</h1>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed text-center">{message}</p>
        </CardContent>
        <CardFooter className="flex flex-col border-t bg-muted/20 pt-5">
          <HelpEmailFooter />
        </CardFooter>
      </Card>
    </div>
  );
}

const SignConvenioByToken = () => {
  const { token } = useParams<{ token: string }>();
  const pdfViewerRef = useRef<PDFViewerRef>(null);
  const signedPdfForDownloadRef = useRef<Blob | null>(null);
  const isLandscapeMobile = useIsLandscapeMobile();

  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [canSign, setCanSign] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string>("");
  const [signingEstado, setSigningEstado] = useState<string | null>(null);
  const [nombreConvenio, setNombreConvenio] = useState<string>("");
  const [firmadoAfiliadoAt, setFirmadoAfiliadoAt] = useState<string | null>(null);
  const [firmadoPresidenteAt, setFirmadoPresidenteAt] = useState<string | null>(null);
  const [rechazadoAt, setRechazadoAt] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [viewerHeaderTitle, setViewerHeaderTitle] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const {
    pdfFile,
    signature,
    signaturePosition,
    totalPages,
    isDownloading,
    handleFileSelect,
    handleSignatureCreate,
    handleClearSignature,
    setSignaturePosition,
    setTotalPages,
    buildSignedPdfBlob,
  } = usePDFSigner();

  const { trackEvent, getAuditLog } = useAuditTrail();

  const tour = useTour();
  const { currentPhase: tourCurrentPhase, isPhaseShown, startPhase, endPhase, setRun: setTourRun } = tour;

  useLayoutEffect(() => {
    setTourRun(false);
  }, [setTourRun]);

  useEffect(() => {
    if (!pdfFile) return;
    if (isPhaseShown("viewer")) return;
    if (tourCurrentPhase === "viewer") return;

    const shouldStartViewer =
      tourCurrentPhase === "welcome" ||
      (tourCurrentPhase === "none" && isPhaseShown("welcome"));

    if (!shouldStartViewer) return;

    setTourRun(false);

    const timer = setTimeout(() => startPhase("viewer"), 700);
    return () => clearTimeout(timer);
  }, [pdfFile, tourCurrentPhase, isPhaseShown, startPhase, setTourRun]);

  const handleSignatureModalOpen = useCallback(() => {
    if (!isPhaseShown("modal")) {
      startPhase("modal");
    }
  }, [isPhaseShown, startPhase]);

  useEffect(() => {
    if (!signature) return;
    if (isPhaseShown("placed")) return;

    const timer = setTimeout(() => startPhase("placed"), 600);
    return () => clearTimeout(timer);
  }, [signature, isPhaseShown, startPhase]);

  const handleTourPhaseEnd = useCallback(() => {
    endPhase();
  }, [endPhase]);

  const loadMetadataAndPdf = useCallback(async () => {
    if (!token) {
      setMetaError(GENERIC_INVALID_OR_MISSING_LINK_MESSAGE);
      setMetaLoading(false);
      return;
    }

    setMetaLoading(true);
    setMetaError(null);

    try {
      const metaRes = await fetch(convenioFirmaMetadataUrl(token));
      let metaJson: MetadataPayload;
      try {
        metaJson = (await metaRes.json()) as MetadataPayload;
      } catch {
        setMetaError("No se pudo leer la respuesta del servidor.");
        setMetaLoading(false);
        return;
      }

      if (!metaRes.ok || !metaJson.success) {
        const fallback =
          metaRes.status === 404
            ? GENERIC_INVALID_OR_MISSING_LINK_MESSAGE
            : (metaJson.message ?? "No se pudo cargar la información del convenio.");
        setMetaError(fallback);
        setMetaLoading(false);
        return;
      }

      const d = metaJson.data;
      const rawHeaderTitle = typeof d?.header_title === "string" ? d.header_title.trim() : "";
      setViewerHeaderTitle(rawHeaderTitle !== "" ? rawHeaderTitle : null);
      setAffiliateName(d?.nombre_afiliado ?? "");
      setNombreConvenio(d?.nombre_convenio ?? "");
      setSigningEstado(d?.signing_estado ?? null);
      setFirmadoAfiliadoAt(d?.firmado_afiliado_at ?? null);
      setFirmadoPresidenteAt(d?.firmado_presidente_at ?? null);
      setRechazadoAt(d?.rechazado_at ?? null);
      setMotivoRechazo(d?.motivo_rechazo ?? null);
      setExpiresAt(d?.expires_at ?? null);
      setCanSign(Boolean(d?.can_sign));

      if (!d?.can_sign) {
        setMetaLoading(false);
        return;
      }

      setPdfLoading(true);
      const pdfRes = await fetch(convenioFirmaDocumentUrl(token));
      if (!pdfRes.ok) {
        setMetaError("No se pudo descargar el PDF del convenio.");
        setPdfLoading(false);
        setMetaLoading(false);
        return;
      }

      const blob = await pdfRes.blob();
      const file = new File([blob], "convenio.pdf", { type: "application/pdf" });
      handleFileSelect(file);
      setPdfLoading(false);
    } catch {
      setMetaError("Error de conexión. Intenta nuevamente más tarde.");
    } finally {
      setMetaLoading(false);
    }
  }, [token, handleFileSelect]);

  useEffect(() => {
    void loadMetadataAndPdf();
  }, [loadMetadataAndPdf]);

  const handleFinishAndSend = useCallback(() => {
    if (!signature) {
      pdfViewerRef.current?.activatePlacementMode();
      return;
    }
    setShowConfirm(true);
  }, [signature]);

  useKeyboardShortcuts(
    [
      {
        key: "s",
        ctrlKey: true,
        metaKey: true,
        handler: async () => {
          if (!isDownloading && !isSubmitting && !isSent) {
            handleFinishAndSend();
          }
        },
        description: "Colocar firma / Finalizar y enviar",
      },
    ],
    Boolean(pdfFile),
  );

  const handleConfirmSubmit = async () => {
    if (!token || !canSign) {
      return;
    }

    let signedBlob: Blob | null = null;
    setIsSubmitting(true);
    try {
      trackEvent("document_submitted", {
        fileName: pdfFile?.name,
        signaturePage: signaturePosition?.page,
      });

      const auditLog = getAuditLog();
      console.log("[AuditTrail] Document submitted:", JSON.stringify(auditLog, null, 2));

      signedBlob = await buildSignedPdfBlob();
      const fd = new FormData();
      fd.append("pdf", signedBlob, "convenio-firmado-afiliado.pdf");

      const res = await fetch(convenioFirmaSubmitUrl(token), {
        method: "POST",
        body: fd,
      });

      const json = (await res.json()) as { success?: boolean; message?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "No se pudo enviar el documento.");
      }

      setIsSent(true);
      setShowConfirm(false);
      trackEvent("document_confirmed");
      toast.success("Convenio enviado correctamente.");

      signedPdfForDownloadRef.current = signedBlob;
      const blobForDownload = signedBlob;
      window.setTimeout(() => {
        if (!blobForDownload) {
          return;
        }
        try {
          trackEvent("document_downloaded", { auto: true });
          const url = URL.createObjectURL(blobForDownload);
          const link = document.createElement("a");
          link.href = url;
          link.download = "convenio-firmado-afiliado.pdf";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (downloadError) {
          const errorMessage =
            downloadError instanceof Error ? downloadError.message : "Error al descargar el PDF";
          toast.error("Error al descargar", { description: errorMessage });
        }
      }, 500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al enviar el convenio.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualDownloadSignedPdf = useCallback(() => {
    const blob = signedPdfForDownloadRef.current;
    if (!blob) {
      toast.error("No hay un archivo para descargar.");
      return;
    }
    try {
      trackEvent("document_downloaded", { auto: false });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "convenio-firmado-afiliado.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      const errorMessage =
        downloadError instanceof Error ? downloadError.message : "Error al descargar el PDF";
      toast.error("Error al descargar", { description: errorMessage });
    }
  }, [trackEvent]);

  const convenioBlockedKind = useMemo((): BlockedSigningKind | null => {
    if (!token || metaLoading || pdfLoading || metaError || canSign) {
      return null;
    }
    return resolveBlockedSigningKind(signingEstado);
  }, [token, metaLoading, pdfLoading, metaError, canSign, signingEstado]);

  const resolvedViewerHeaderTitle = viewerHeaderTitle ?? appConfig.headerTitle;

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <AppTour
        phase={tourCurrentPhase}
        run={tour.run}
        stepIndex={tour.stepIndex}
        onStepChange={tour.setStepIndex}
        onPhaseEnd={handleTourPhaseEnd}
      />

      {!token ? (
        <ConvenioGenericErrorPanel message={GENERIC_INVALID_OR_MISSING_LINK_MESSAGE} />
      ) : metaLoading || pdfLoading ? (
        <>
          <Header
            showFinishButton={false}
            isProcessing={true}
            isSent={false}
            title={resolvedViewerHeaderTitle}
          />
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Cargando tu convenio…</p>
          </div>
        </>
      ) : metaError ? (
        <ConvenioGenericErrorPanel message={metaError} />
      ) : convenioBlockedKind !== null ? (
        <>
          <Header
            showFinishButton={false}
            isProcessing={false}
            isSent={false}
            title={resolvedViewerHeaderTitle}
            brandLogoSrc={
              convenioBlockedKind === "firmado_afiliado" ? appConfig.proSaludBrandLogoSrc : undefined
            }
          />
          <ConvenioCannotSignPanel
            blockedKind={convenioBlockedKind}
            affiliateName={affiliateName}
            convenioName={nombreConvenio}
            firmadoAfiliadoAt={firmadoAfiliadoAt}
            firmadoPresidenteAt={firmadoPresidenteAt}
            rechazadoAt={rechazadoAt}
            motivoRechazo={motivoRechazo}
            expiresAt={expiresAt}
          />
        </>
      ) : (
        <>
          <Header
            showFinishButton={Boolean(signature && signaturePosition) && !isSent}
            onFinish={handleFinishAndSend}
            isProcessing={isDownloading || isSubmitting}
            isSent={isSent}
            title={resolvedViewerHeaderTitle}
          />

          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {pdfFile ? (
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
                  return (
                    <div
                      className="flex-shrink-0 w-full bg-background/95 backdrop-blur-sm border-t border-border/50 z-50"
                      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
                    >
                      <div
                        className={`flex flex-col items-center max-w-lg mx-auto px-3 ${isLandscapeMobile ? "gap-1 py-1" : "gap-1.5 py-2 md:py-2.5"}`}
                      >
                        {isSent ? (
                          <div className="flex flex-col items-center gap-2 w-full">
                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                              <CheckCircle className="w-4 h-4" />
                              Convenio firmado y enviado correctamente
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full max-w-xs"
                              onClick={handleManualDownloadSignedPdf}
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" />
                              Descargar convenio firmado
                            </Button>
                            <p className="text-[11px] text-muted-foreground text-center">
                              Puedes cerrar esta ventana. Si necesitas ayuda, escribe a{" "}
                              <a
                                href={`mailto:${AFFILIATE_HELP_EMAIL}`}
                                className="text-primary font-medium underline-offset-4 hover:underline"
                              >
                                {AFFILIATE_HELP_EMAIL}
                              </a>
                            </p>
                          </div>
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

                            {signature ? (
                              <Button
                                id="tour-footer-action"
                                onClick={handleFinishAndSend}
                                disabled={isDownloading || isSubmitting}
                                className={`w-full ${isLandscapeMobile ? "h-8" : "h-9"}`}
                                size="sm"
                              >
                                <Send className="w-3.5 h-3.5 mr-1.5" />
                                {isDownloading || isSubmitting ? "Procesando…" : "Enviar convenio firmado"}
                              </Button>
                            ) : null}

                            {!isLandscapeMobile && (
                              <p className="text-[10px] text-muted-foreground/50 text-center leading-tight">
                                {!signature
                                  ? "En la página de firma, toca el documento donde quieras colocarla y sigue el asistente para crear tu firma."
                                  : "Revisa tu firma y envía el documento"}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </main>
        </>
      )}

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar convenio firmado</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-left space-y-3 text-sm text-muted-foreground">
                <p>
                  Al confirmar, enviarás tu convenio firmado a ProSalud. Esta acción no se puede deshacer desde aquí.
                </p>
                <div className="bg-muted/30 p-3 rounded-lg space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <span>Documento firmado digitalmente</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    <span>
                      {new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting}
              onClick={() => void handleConfirmSubmit()}
              className="gap-2"
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

export default SignConvenioByToken;
