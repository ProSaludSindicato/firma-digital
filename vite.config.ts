import { copyFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

function copyPdfjsWorkerToPublic() {
  return {
    name: "copy-pdfjs-worker-to-public",
    buildStart() {
      copyFileSync(
        path.resolve(
          __dirname,
          "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        ),
        path.resolve(__dirname, "public/pdf.worker.js"),
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.PROSALUD_API_PROXY_TARGET || "https://prosalud.test";
  const apiProxy = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
      secure: false,
    },
  };

  return {
    base: "/",
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: apiProxy,
    },
    preview: {
      proxy: apiProxy,
    },
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/pdfjs-dist")) {
              return "pdfjs";
            }
          },
        },
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext",
      },
    },
    plugins: [
      copyPdfjsWorkerToPublic(),
      react(),
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
