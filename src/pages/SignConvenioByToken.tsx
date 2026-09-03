import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Check,
  Clock,
  Download,
  Loader2,
  Mail,
  Send,
  type LucideIcon,
} from "lucide-react";
import { AppTour } from "@/components/AppTour";
import { ConvenioSatisfactionRatingModal } from "@/components/ConvenioSatisfactionRatingModal";
import { EditorGuideBar } from "@/components/editor/EditorGuideBar";
import { Header } from "@/components/Header";
import {
  DocumentEditorViewer,
  type DocumentEditorViewerRef,
} from "@/components/editor/DocumentEditorViewer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useAuditTrail } from "@/hooks/useAuditTrail";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useDocumentEditor } from "@/hooks/useDocumentEditor";
import { useTour } from "@/hooks/useTour";
import { useIsLandscapeMobile, useIsMobile } from "@/hooks/use-mobile";
import { appConfig } from "@/lib/appConfig";
import { CONVENIO_EDITOR_CONSTRAINTS } from "@/lib/convenioEditorConfig";
import { exportDocumentToPdf } from "@/lib/pdfFieldExporter";
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

const AFFILIATE_HELP_EMAIL = "auxiliartalento.sprosalud@gmail.com";

const GENERIC_INVALID_OR_MISSING_LINK_MESSAGE =
  "No pudimos verificar este enlace. Comprueba que copiaste la dirección completa o solicita un nuevo correo con un enlace válido.";

type MetadataPayload = {
  success: boolean;
  data?: {
    signing_estado?: string | null;
    can_sign?: boolean;
    nombre_afiliado?: string;
    nombre_convenio?: string;
    documento?: string;
    download_filename?: string;
    expires_at?: string | null;
    /** Título de cabecera del visor (viene del backend). */
    header_title?: string | null;
    firmado_afiliado_at?: string | null;
    firmado_presidente_at?: string | null;
    rechazado_at?: string | null;
    motivo_rechazo?: string | null;
    can_rate_satisfaction?: boolean;
    satisfaction_score?: number | null;
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

function HelpEmailFooter() {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
      <span className="text-sm text-foreground/50">¿Necesitas ayuda?</span>
      <a
        href={`mailto:${AFFILIATE_HELP_EMAIL}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <Mail className="h-4 w-4 shrink-0" aria-hidden />
        {AFFILIATE_HELP_EMAIL}
      </a>
    </div>
  );
}

type StatusTone = "success" | "danger" | "warning" | "neutral";

const STATUS_MARK_TONE: Record<StatusTone, string> = {
  success: "bg-emerald-600 text-white dark:bg-emerald-500",
  danger: "bg-destructive text-destructive-foreground",
  warning: "bg-amber-500 text-white",
  neutral: "bg-secondary text-secondary-foreground",
};

function StatusMark({ icon: Icon, tone }: { icon: LucideIcon; tone: StatusTone }) {
  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full lg:h-14 lg:w-14",
        STATUS_MARK_TONE[tone],
      )}
      aria-hidden
    >
      <Icon className="h-5 w-5 lg:h-6 lg:w-6" strokeWidth={2.25} />
    </div>
  );
}

function StatusPageShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-background">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-5 py-8 sm:px-8 md:px-10 lg:px-12 lg:py-12 xl:px-16">
        <div className="flex flex-1 flex-col justify-center py-4 lg:py-8">{children}</div>
        {footer ? (
          <footer className="mt-10 shrink-0 border-t border-border/70 pt-5 lg:mt-12 lg:pt-6">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <dt className="text-xs font-medium uppercase tracking-[0.16em] text-foreground/45">{label}</dt>
      <dd className="text-base font-medium leading-snug text-foreground sm:text-lg">{value}</dd>
    </div>
  );
}

type ConvenioCannotSignPanelProps = {
  blockedKind: BlockedSigningKind;
  affiliateName: string;
  firmadoAfiliadoAt: string | null;
  firmadoPresidenteAt: string | null;
  rechazadoAt: string | null;
  motivoRechazo: string | null;
  expiresAt: string | null;
  onDownload?: () => void;
};

function ConvenioCannotSignPanel({
  blockedKind,
  affiliateName,
  firmadoAfiliadoAt,
  rechazadoAt,
  motivoRechazo,
  expiresAt,
  onDownload,
}: ConvenioCannotSignPanelProps) {
  const firmadoAfiliadoLabel = formatLocaleDateTime(firmadoAfiliadoAt);
  const rechazadoLabel = formatLocaleDateTime(rechazadoAt);
  const expiresLabel = formatLocaleDateTime(expiresAt);

  let icon: LucideIcon;
  let tone: StatusTone;
  let title: string;
  let description: string;
  let extraNote: string | undefined;

  switch (blockedKind) {
    case "firmado_afiliado":
      icon = BadgeCheck;
      tone = "success";
      title = "Tu firma ya fue recibida";
      description = onDownload
        ? "ProSalud registró correctamente el convenio. Ya puedes descargar una copia o cerrar esta ventana."
        : "ProSalud registró correctamente el convenio que enviaste. Puedes usar esta pantalla para confirmar que el envío se completó.";
      extraNote =
        "No es necesario responder el correo ni enviar el convenio por WhatsApp u otros canales. ProSalud ya recibió tu firma.";
      break;
    case "rechazado":
      icon = Ban;
      tone = "danger";
      title = "Este convenio no puede continuar";
      description =
        "El trámite asociado a este enlace fue rechazado. Si tienes dudas, escríbenos con tu documento de identidad a mano.";
      break;
    case "expirado":
      icon = Clock;
      tone = "warning";
      title = "Este enlace expiró";
      description =
        "Por seguridad, los enlaces de firma tienen vigencia limitada. Solicita un nuevo correo con un enlace actualizado para poder firmar.";
      break;
    default:
      icon = AlertCircle;
      tone = "neutral";
      title = "No puedes firmar con este enlace";
      description =
        "Este enlace ya no está habilitado para registrar la firma. Si crees que es un error, contáctanos y te orientamos.";
  }

  const metaFields: { label: string; value: string }[] = [];
  if (affiliateName) {
    metaFields.push({ label: "Afiliado/a", value: affiliateName });
  }
  if (blockedKind === "firmado_afiliado" && firmadoAfiliadoLabel) {
    metaFields.push({ label: "Registro de envío", value: firmadoAfiliadoLabel });
  }
  if (blockedKind === "expirado" && expiresLabel) {
    metaFields.push({ label: "Vencimiento del enlace", value: expiresLabel });
  }
  if (blockedKind === "rechazado" && rechazadoLabel) {
    metaFields.push({ label: "Registro", value: rechazadoLabel });
  }

  const rejectionNote = blockedKind === "rechazado" ? motivoRechazo?.trim() : undefined;

  return (
    <StatusPageShell footer={<HelpEmailFooter />}>
      <div
        className={cn(
          "flex flex-col gap-12",
          metaFields.length > 0 &&
            "lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(17rem,0.85fr)] lg:items-start lg:gap-16 xl:gap-24",
        )}
        role={blockedKind === "firmado_afiliado" ? "status" : undefined}
      >
        <div className="flex items-start gap-4 sm:gap-5 lg:gap-6">
          <StatusMark icon={icon} tone={tone} />
          <div className="min-w-0 space-y-4 pt-0.5 lg:space-y-5">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] xl:text-5xl lg:leading-[1.12]">
              {title}
            </h1>
            <div className="max-w-xl space-y-3">
              <p className="text-base leading-relaxed text-foreground/60 lg:text-lg">{description}</p>
              {extraNote ? (
                <p className="text-base leading-relaxed text-foreground/75 lg:text-lg">{extraNote}</p>
              ) : null}
            </div>
            {onDownload ? (
              <Button
                type="button"
                variant="outline"
                onClick={onDownload}
                className="mt-1 h-11 rounded-full px-5 text-sm font-semibold sm:h-12 sm:px-6"
              >
                <Download className="mr-2 h-4 w-4" />
                Descargar convenio firmado
              </Button>
            ) : null}
          </div>
        </div>

        {metaFields.length > 0 ? (
          <aside className="border-t border-border/70 pt-8 lg:border-l lg:border-t-0 lg:pt-1 lg:pl-12 xl:pl-16">
            <dl className="grid gap-7 sm:grid-cols-2 lg:grid-cols-1 lg:gap-8">
              {metaFields.map((field) => (
                <MetaField key={field.label} label={field.label} value={field.value} />
              ))}
            </dl>
            {rejectionNote ? (
              <div className="mt-8 rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm leading-relaxed text-foreground">
                {rejectionNote}
              </div>
            ) : null}
          </aside>
        ) : rejectionNote ? (
          <div className="max-w-3xl rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm leading-relaxed text-foreground">
            {rejectionNote}
          </div>
        ) : null}
      </div>
    </StatusPageShell>
  );
}

function ConvenioGenericErrorPanel({ message }: { message: string }) {
  return (
    <StatusPageShell footer={<HelpEmailFooter />}>
      <div className="flex max-w-3xl items-start gap-4 sm:gap-5 lg:gap-6">
        <StatusMark icon={AlertCircle} tone="danger" />
        <div className="min-w-0 space-y-4 pt-0.5">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl lg:leading-[1.12]">
            No pudimos abrir el enlace
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-foreground/60 lg:text-lg">{message}</p>
        </div>
      </div>
    </StatusPageShell>
  );
}

const SignConvenioByToken = () => {
  const { token } = useParams<{ token: string }>();
  const pdfViewerRef = useRef<DocumentEditorViewerRef>(null);
  const signedPdfForDownloadRef = useRef<Blob | null>(null);
  const isLandscapeMobile = useIsLandscapeMobile();
  const isMobile = useIsMobile();

  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [canSign, setCanSign] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string>("");
  const [signingEstado, setSigningEstado] = useState<string | null>(null);
  const [firmadoAfiliadoAt, setFirmadoAfiliadoAt] = useState<string | null>(null);
  const [firmadoPresidenteAt, setFirmadoPresidenteAt] = useState<string | null>(null);
  const [rechazadoAt, setRechazadoAt] = useState<string | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [canRateSatisfaction, setCanRateSatisfaction] = useState(false);
  const [satisfactionScore, setSatisfactionScore] = useState<number | null>(null);
  const [satisfactionModalOpen, setSatisfactionModalOpen] = useState(false);
  const satisfactionModalScheduledRef = useRef(false);
  const [viewerHeaderTitle, setViewerHeaderTitle] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("convenio-firmado-afiliado.pdf");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const editor = useDocumentEditor(isMobile);
  const { setFile } = editor;
  const signatureField = editor.fields.find((field) => field.type === "signature");
  const signature =
    signatureField?.value?.type === "signature"
      ? signatureField.value.dataUrl
      : null;
  const signaturePosition = signatureField
    ? {
        x: signatureField.x,
        y: signatureField.y,
        page: signatureField.page,
        width: signatureField.width,
        height: signatureField.height,
        scale: signatureField.scale,
      }
    : null;
  const pdfFile = editor.file;
  const isDownloading = false;

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
      setDownloadFilename(
        typeof d?.download_filename === "string" && d.download_filename.trim() !== ""
          ? d.download_filename.trim()
          : "convenio-firmado-afiliado.pdf",
      );
      setSigningEstado(d?.signing_estado ?? null);
      setFirmadoAfiliadoAt(d?.firmado_afiliado_at ?? null);
      setFirmadoPresidenteAt(d?.firmado_presidente_at ?? null);
      setRechazadoAt(d?.rechazado_at ?? null);
      setMotivoRechazo(d?.motivo_rechazo ?? null);
      setExpiresAt(d?.expires_at ?? null);
      setCanRateSatisfaction(Boolean(d?.can_rate_satisfaction));
      setSatisfactionScore(
        typeof d?.satisfaction_score === "number" ? d.satisfaction_score : null,
      );
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
      setFile(file);
      setPdfLoading(false);
    } catch (error) {
      if (error instanceof Error && error.message.includes("VITE_PROSALUD_API_URL")) {
        setMetaError("La aplicación de firma no está configurada para conectar con ProSalud.");
        return;
      }
      setMetaError("Error de conexión. Intenta nuevamente mas tarde.");
    } finally {
      setMetaLoading(false);
    }
  }, [token, setFile]);

  useEffect(() => {
    void loadMetadataAndPdf();
  }, [loadMetadataAndPdf]);

  const handleFinishAndSend = useCallback(() => {
    if (!signature) {
      pdfViewerRef.current?.activatePlacementMode("signature");
      if (signatureField) {
        pdfViewerRef.current?.openSignatureModal(signatureField.id);
      }
      return;
    }
    setShowConfirm(true);
  }, [signature, signatureField]);

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
      if (!pdfFile) {
        throw new Error("No hay un documento cargado.");
      }

      trackEvent("terms_accepted");
      trackEvent("document_submitted", {
        fileName: pdfFile.name,
        signaturePage: signaturePosition?.page,
        totalPages,
      });

      const auditLog = getAuditLog();

      signedBlob = await exportDocumentToPdf(pdfFile, editor.fields);
      const fd = new FormData();
      fd.append("pdf", signedBlob, downloadFilename);
      fd.append("audit_log", JSON.stringify(auditLog));
      fd.append("terms_accepted", "1");

      const res = await fetch(convenioFirmaSubmitUrl(token), {
        method: "POST",
        body: fd,
      });

      const json = (await res.json()) as {
        success?: boolean;
        message?: string;
        code?: string;
      };

      if (!res.ok || !json.success) {
        if (json.code === "document_integrity_mismatch") {
          throw new Error(
            json.message ??
              "El documento enviado no coincide con el convenio original. Solo coloque su firma y vuelva a intentarlo.",
          );
        }

        throw new Error(json.message ?? "No se pudo enviar el documento.");
      }

      setFirmadoAfiliadoAt(new Date().toISOString());
      setIsSent(true);
      setCanRateSatisfaction(true);
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
          link.download = downloadFilename;
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
      link.download = downloadFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      const errorMessage =
        downloadError instanceof Error ? downloadError.message : "Error al descargar el PDF";
      toast.error("Error al descargar", { description: errorMessage });
    }
  }, [downloadFilename, trackEvent]);

  const convenioBlockedKind = useMemo((): BlockedSigningKind | null => {
    if (!token || metaLoading || pdfLoading || metaError || canSign) {
      return null;
    }
    return resolveBlockedSigningKind(signingEstado);
  }, [token, metaLoading, pdfLoading, metaError, canSign, signingEstado]);

  const shouldOfferSatisfaction =
    Boolean(token) && canRateSatisfaction && satisfactionScore === null;

  useEffect(() => {
    if (!shouldOfferSatisfaction || satisfactionModalScheduledRef.current) {
      return;
    }

    const canPromptAfterSend = isSent;
    const canPromptOnReturn = convenioBlockedKind === "firmado_afiliado";
    if (!canPromptAfterSend && !canPromptOnReturn) {
      return;
    }

    satisfactionModalScheduledRef.current = true;
    const delayMs = isSent ? 700 : 900;
    const timer = window.setTimeout(() => {
      setSatisfactionModalOpen(true);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [shouldOfferSatisfaction, isSent, convenioBlockedKind]);

  const handleSatisfactionRated = useCallback((score: number) => {
    setSatisfactionScore(score);
  }, []);

  const handleSatisfactionModalOpenChange = useCallback((open: boolean) => {
    setSatisfactionModalOpen(open);
  }, []);

  const showSatisfactionModal =
    Boolean(token) &&
    (satisfactionModalOpen || (canRateSatisfaction && satisfactionScore === null));

  const resolvedViewerHeaderTitle = viewerHeaderTitle ?? appConfig.headerTitle;

  return (
    <div className="h-dvh bg-background flex flex-col overflow-hidden">
      <AppTour
        phase={tourCurrentPhase}
        run={tour.run}
        stepIndex={tour.stepIndex}
        viewerVariant="document-editor"
        onStepChange={tour.setStepIndex}
        onPhaseEnd={handleTourPhaseEnd}
      />

      {showSatisfactionModal ? (
        <ConvenioSatisfactionRatingModal
          token={token!}
          canRate={canRateSatisfaction}
          initialScore={satisfactionScore}
          open={satisfactionModalOpen}
          onOpenChange={handleSatisfactionModalOpenChange}
          onRated={handleSatisfactionRated}
        />
      ) : null}

      {!token ? (
        <ConvenioGenericErrorPanel message={GENERIC_INVALID_OR_MISSING_LINK_MESSAGE} />
      ) : metaLoading || pdfLoading ? (
        <>
          <Header
            variant="document"
            showDocumentIcon
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
      ) : convenioBlockedKind !== null || isSent ? (
        <>
          <Header
            showFinishButton={false}
            isProcessing={false}
            isSent={isSent}
            title={resolvedViewerHeaderTitle}
            brandLogoSrc={
              isSent || convenioBlockedKind === "firmado_afiliado"
                ? appConfig.proSaludBrandLogoSrc
                : undefined
            }
          />
          <ConvenioCannotSignPanel
            blockedKind={convenioBlockedKind ?? "firmado_afiliado"}
            affiliateName={affiliateName}
            firmadoAfiliadoAt={firmadoAfiliadoAt}
            firmadoPresidenteAt={firmadoPresidenteAt}
            rechazadoAt={rechazadoAt}
            motivoRechazo={motivoRechazo}
            expiresAt={expiresAt}
            onDownload={isSent ? handleManualDownloadSignedPdf : undefined}
          />
        </>
      ) : (
        <>
          <Header
            variant="document"
            showDocumentIcon
            title={resolvedViewerHeaderTitle}
            subtitle={totalPages > 0 ? `Página ${currentPage} de ${totalPages}` : undefined}
            showFinishButton={Boolean(signature && signaturePosition) && !isSent}
            onFinish={handleFinishAndSend}
            isProcessing={isDownloading || isSubmitting}
            isSent={isSent}
            finishLabel="Enviar"
          />

          {!isSent ? (
            <EditorGuideBar
              showDefaultHint={false}
              placingType={null}
              customHint={
                signature
                  ? "Arrastra la firma para colocarla sobre la línea. El lápiz la edita."
                  : "Desplázate hasta la última página y toca donde quieras colocar tu firma."
              }
            />
          ) : null}

          <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {pdfFile ? (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <DocumentEditorViewer
                    ref={pdfViewerRef}
                    file={pdfFile}
                    fields={editor.fields}
                    activeFieldId={editor.activeFieldId}
                    placingType={editor.placingType}
                    constraints={CONVENIO_EDITOR_CONSTRAINTS}
                    isLocked={isSent}
                    onSelectField={editor.selectField}
                    onUpdateField={editor.updateField}
                    onRemoveField={editor.removeField}
                    onChangeValue={editor.setValue}
                    onPlaceField={editor.addFieldAt}
                    onSetPlacingType={editor.setPlacingType}
                    onSignatureModalOpen={handleSignatureModalOpen}
                    onCurrentPageChange={setCurrentPage}
                    onTotalPagesChange={setTotalPages}
                    onTrackEvent={trackEvent}
                    scrollToSignaturePageOnLoad={
                      pdfViewerConfig.scrollToSignaturePageOnLoad
                    }
                    signaturePageScrollDelayMs={
                      pdfViewerConfig.signaturePageScrollDelayMs
                    }
                    continuousScroll={pdfViewerConfig.continuousScroll}
                    signaturePageScrollBlock={
                      pdfViewerConfig.signaturePageScrollBlock
                    }
                  />
                </div>

                {(() => {
                  const completedSteps = signature ? 2 : 1;
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
                        <div className={cn(
                          "mx-auto w-full",
                          signature ? "max-w-lg px-4 lg:max-w-xl" : "max-w-md px-4 lg:max-w-lg",
                          isLandscapeMobile
                            ? "py-1.5"
                            : signature
                              ? "py-2.5 md:py-3 lg:py-4"
                              : "py-2 md:py-2.5 lg:py-3",
                        )}>
                          {signature ? (
                            <Button
                              id="tour-footer-action"
                              onClick={handleFinishAndSend}
                              disabled={isDownloading || isSubmitting}
                              className={cn(
                                "w-full gap-2 rounded-full font-semibold shadow-sm",
                                isLandscapeMobile
                                  ? "h-8 text-xs"
                                  : "h-10 text-sm lg:h-14 lg:gap-2.5 lg:text-lg lg:font-bold lg:shadow-md lg:[&_svg]:size-5",
                                !isLandscapeMobile && "mb-2.5 lg:mb-3.5",
                              )}
                            >
                              <Send className="h-4 w-4 lg:h-5 lg:w-5" />
                              {isDownloading || isSubmitting ? "Procesando…" : "Enviar convenio firmado"}
                            </Button>
                          ) : null}

                          {!isLandscapeMobile && (
                            <div
                              className={cn(
                                "flex items-center justify-center",
                                !signature && "rounded-xl border border-border/50 bg-muted/25 px-3 py-2 sm:px-4 sm:py-2.5",
                              )}
                            >
                              {steps.map((step, i) => (
                                <div key={step.label} className="flex items-center">
                                  <div className="flex flex-col items-center gap-1 lg:gap-1.5">
                                    <div
                                      className={cn(
                                        "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors lg:h-8 lg:w-8 lg:text-xs",
                                        step.done
                                          ? "bg-primary text-primary-foreground shadow-sm"
                                          : !step.done && i === completedSteps
                                            ? "border-2 border-primary/40 bg-primary/5 text-primary"
                                            : "border border-border bg-background text-muted-foreground",
                                      )}
                                    >
                                      {step.done ? (
                                        <Check className="h-3.5 w-3.5 lg:h-4 lg:w-4" strokeWidth={2.5} />
                                      ) : (
                                        i + 1
                                      )}
                                    </div>
                                    <span className={cn(
                                      "text-[10px] font-medium leading-none lg:text-sm",
                                      step.done || (!step.done && i === completedSteps)
                                        ? "text-primary"
                                        : "text-muted-foreground/70",
                                    )}>
                                      {step.label}
                                    </span>
                                  </div>
                                  {i < steps.length - 1 && (
                                    <div
                                      className={cn(
                                        "mx-2 h-px w-10 -translate-y-1.5 transition-colors sm:mx-3 sm:w-14 lg:mx-4 lg:w-20 lg:-translate-y-2.5",
                                        steps[i + 1].done ? "bg-primary" : "bg-border",
                                      )}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
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

      <AlertDialog open={showConfirm} onOpenChange={(open) => {
        setShowConfirm(open);
        if (!open) {
          setTermsAccepted(false);
        }
      }}>
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
                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox
                    id="terms-accepted"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                    disabled={isSubmitting}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="terms-accepted"
                    className="text-xs leading-relaxed text-muted-foreground font-normal cursor-pointer select-none"
                  >
                    Acepto los{" "}
                    <a
                      href="https://prosalud.com.co/terminos-y-condiciones"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium underline underline-offset-4"
                    >
                      términos y condiciones
                    </a>{" "}
                    y la{" "}
                    <a
                      href="https://prosalud.com.co/politica-de-tratamiento-de-datos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium underline underline-offset-4"
                    >
                      política de tratamiento de datos personales
                    </a>.
                  </Label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSubmitting || !termsAccepted}
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
