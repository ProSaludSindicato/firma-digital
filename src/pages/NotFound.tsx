import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { getProsaludPortalUrl, isPublicToolsEnabled } from "@/lib/appConfig";

const NotFound = () => {
  const location = useLocation();
  const publicToolsEnabled = isPublicToolsEnabled();
  const portalUrl = getProsaludPortalUrl();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">No encontramos esta página</p>
        {publicToolsEnabled ? (
          <a href="/" className="text-primary underline hover:text-primary/90">
            Volver al inicio
          </a>
        ) : portalUrl ? (
          <a href={portalUrl} className="text-primary underline hover:text-primary/90">
            Ir al portal de ProSalud
          </a>
        ) : null}
      </div>
    </div>
  );
};

export default NotFound;
