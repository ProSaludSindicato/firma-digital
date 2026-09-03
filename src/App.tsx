import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isPublicToolsEnabled } from "@/lib/appConfig";
import Index from "./pages/Index";
import AutoSign from "./pages/AutoSign";
import SignConvenioByToken from "./pages/SignConvenioByToken";
import DocumentEditorPage from "./pages/DocumentEditor";
import DocumentByToken from "./pages/DocumentByToken";
import NotFound from "./pages/NotFound";
import PublicToolsUnavailable from "./pages/PublicToolsUnavailable";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const publicToolsEnabled = isPublicToolsEnabled();

  return (
    <ErrorBoundary phase="app">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route
                path="/"
                element={publicToolsEnabled ? <Index /> : <PublicToolsUnavailable />}
              />
              <Route path="/sign/:token" element={<SignConvenioByToken />} />
              <Route
                path="/editor"
                element={publicToolsEnabled ? <DocumentEditorPage /> : <PublicToolsUnavailable />}
              />
              <Route path="/document/:token" element={<DocumentByToken />} />
              <Route path="/auto-sign" element={<AutoSign />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
