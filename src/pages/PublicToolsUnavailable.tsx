import { Link2, Mail } from "lucide-react";
import { Header } from "@/components/Header";
import { appConfig } from "@/lib/appConfig";

const PublicToolsUnavailable = () => {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <Header
        showFinishButton={false}
        isProcessing={false}
        isSent={false}
        title={appConfig.headerTitle}
        brandLogoSrc={appConfig.proSaludBrandLogoSrc}
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-white dark:bg-background">
        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 py-5 sm:px-8 sm:py-8 md:px-10 lg:px-12 lg:py-12 xl:px-16">
          <div className="flex flex-1 flex-col justify-start py-1 sm:py-4 lg:justify-center lg:py-8">
            <div className="flex max-w-3xl items-start gap-3 sm:gap-5 lg:gap-6">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground sm:h-11 sm:w-11 lg:h-14 lg:w-14"
                aria-hidden
              >
                <Link2 className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 space-y-3 pt-0.5 sm:space-y-4">
                <h1 className="text-balance font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl lg:leading-[1.12]">
                  Acceso solo con un enlace personal
                </h1>
                <p className="max-w-2xl text-sm leading-snug text-foreground/60 sm:text-base sm:leading-relaxed lg:text-lg">
                  Esta instancia de Firma Digital es para convenios y documentos que ProSalud envía
                  por correo. Si llegaste aquí recortando la dirección, vuelve al mensaje y abre el
                  enlace completo.
                </p>
              </div>
            </div>
          </div>
          <footer className="mt-6 shrink-0 border-t border-border/70 pt-4 sm:mt-10 sm:pt-5 lg:mt-12 lg:pt-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <span className="text-xs text-foreground/50 sm:text-sm">¿Necesitas ayuda?</span>
              <a
                href={`mailto:${appConfig.affiliateHelpEmail}`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline sm:gap-2 sm:text-sm"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                {appConfig.affiliateHelpEmail}
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default PublicToolsUnavailable;
