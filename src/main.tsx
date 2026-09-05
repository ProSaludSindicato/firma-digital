import { installPromiseWithResolversPolyfill } from "@/lib/promiseWithResolversPolyfill";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

installPromiseWithResolversPolyfill();

createRoot(document.getElementById("root")!).render(<App />);
