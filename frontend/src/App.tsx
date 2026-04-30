import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation, useMatch } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Nav } from "./components/Nav";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ScrollToTop } from "./components/ScrollToTop";
import { CoachWidget } from "./components/CoachWidget";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import RoleSelect from "./pages/RoleSelect";
import Dashboard from "./pages/Dashboard";
import Share from "./pages/Share";
import { useStore } from "./store/useStore";

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><Landing /></Page>} />
        <Route path="/upload" element={<Page><Upload /></Page>} />
        <Route path="/role" element={<Page><RoleSelect /></Page>} />
        <Route path="/dashboard" element={<Page><Dashboard /></Page>} />
        <Route path="/share/:id" element={<Page><Share /></Page>} />
        <Route path="*" element={<Page><NotFound /></Page>} />
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const { theme } = useStore();
  const shareMatch = useMatch("/share/:id");

  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("dark", theme === "dark");
    html.classList.toggle("light", theme === "light");
  }, [theme]);

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <ErrorBoundary>
          <AnimatedRoutes />
        </ErrorBoundary>
      </main>
      <footer
        className="text-center py-8 text-xs"
        style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}
      >
        Built for the hackathon ·{" "}
        <span className="gradient-text font-semibold">SkillBridge AI</span> ·
        Gemini-powered
      </footer>
      {!shareMatch && <CoachWidget />}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(17,17,40,0.9)",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(12px)",
          },
          success: { iconTheme: { primary: "#10b981", secondary: "#0b0b1a" } },
          error:   { iconTheme: { primary: "#fb7185", secondary: "#0b0b1a" } },
        }}
      />
    </div>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="section-title">404 — page not found</h1>
      <p className="sub mt-2">That path isn't on the map yet.</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AppShell />
    </BrowserRouter>
  );
}
