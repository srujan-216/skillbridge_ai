import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  ArrowRight, Brain, CheckCircle2, FileText, MessageCircle,
  PlayCircle, Rocket, Sparkles, Target, Trophy, Upload as UploadIcon, Zap,
} from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";
import { Typewriter } from "../components/Typewriter";
import { HeroMockup } from "../components/HeroMockup";
import { ParticleField } from "../components/ParticleField";

export default function Landing() {
  const nav = useNavigate();
  const { setResume, setSelectedRoleId, setIsDemo } = useStore();

  async function startDemo() {
    const id = toast.loading("Loading demo profile…");
    try {
      const d = await api.demo();
      setResume({
        raw_text: "", skills: d.skills, projects: d.projects,
        education: [], experience: [], certifications: [], achievements: [],
        headline: "Early-career data analyst ready to level up.",
        years_experience: 1, confidence: d.confidence, session_id: d.session_id,
      });
      setSelectedRoleId(d.recommended_role_id);
      setIsDemo(true);
      toast.success("Demo ready!", { id });
      nav("/role");
    } catch {
      toast.dismiss(id);
    }
  }

  return (
    <>
      <ParticleField />

      {/* =========== HERO =========== */}
      <section className="relative max-w-7xl mx-auto px-5 md:px-8 pt-10 md:pt-16 pb-16">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="eyebrow"
              style={{ color: "var(--brand-1)" }}
            >
              <Sparkles className="w-3 h-3" />
              Powered by Google Gemini · Built for hackathon judges
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-5 text-[44px] md:text-[68px] leading-[1] font-extrabold tracking-tight"
            >
              Stop guessing.<br />
              <span className="gradient-text">Start growing.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-5 max-w-xl text-lg leading-relaxed"
              style={{ color: "var(--text-dim)" }}
            >
              Upload your resume. See exactly what's missing for your{" "}
              <Typewriter
                className="font-semibold gradient-text"
                phrases={[
                  "dream role",
                  "next interview",
                  "AI engineer goal",
                  "frontend dream job",
                  "data science path",
                ]}
              />
              . Get a 4-week roadmap hand-crafted by AI — complete with resources, projects, and interview prep.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link to="/upload" className="btn-primary btn-lg">
                Upload your resume <ArrowRight className="w-4 h-4" />
              </Link>
              <button onClick={startDemo} className="btn-ghost btn-lg">
                <PlayCircle className="w-4 h-4" /> Try demo with sample resume
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex items-center gap-5 text-sm sub flex-wrap"
            >
              {[
                "Free · no signup",
                "20 target roles",
                "4-week plans",
                "ATS rewriter included",
              ].map((s) => (
                <span key={s} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {s}
                </span>
              ))}
            </motion.div>
          </div>

          <div className="relative">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* =========== STATS =========== */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { icon: Target,   v: "20",    l: "Target roles" },
            { icon: Sparkles, v: "180+",  l: "Skills tracked" },
            { icon: Zap,      v: "< 5s",  l: "To first insight" },
            { icon: Trophy,   v: "4-wk",  l: "Roadmaps shipped" },
          ].map(({ icon: Icon, v, l }, i) => (
            <motion.div
              key={l}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.06 }}
              className="panel px-5 py-5 flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg, var(--brand-1), var(--brand-3))" }}
              >
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl md:text-3xl font-extrabold tabular-nums">{v}</div>
                <div className="sub text-[11px] uppercase tracking-widest truncate">{l}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =========== 3-STEP PROCESS =========== */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="section-head">
          <div>
            <p className="eyebrow" style={{ color: "var(--brand-1)" }}>How it works</p>
            <h2 className="mt-2">Three steps. Zero guesswork.</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {[
            { icon: UploadIcon, title: "Upload", copy: "Drop your resume PDF. Gemini extracts every skill, project, certification, and signal.", step: "01" },
            { icon: Brain,      title: "Analyze", copy: "Pick from 20 real-world roles. We score your readiness against 15+ weighted skills per role.", step: "02" },
            { icon: Rocket,     title: "Learn",   copy: "Get a 4-week roadmap with day-by-day tasks, real resources, projects, and interview prep.", step: "03" },
          ].map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="panel-accent p-6"
            >
              <div className="flex items-start justify-between">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--brand-1), var(--brand-3))" }}
                >
                  <s.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-4xl font-extrabold tabular-nums" style={{ color: "rgba(255,255,255,0.06)" }}>
                  {s.step}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                {s.copy}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =========== FEATURE GRID =========== */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-24">
        <div className="section-head">
          <div>
            <p className="eyebrow" style={{ color: "var(--brand-1)" }}>What you get</p>
            <h2 className="mt-2">More than a roadmap.</h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, title: "AI Career Coach", copy: "Chat with a coach that knows YOUR skills, gaps, and roadmap. Ask anything — get specific answers." },
            { icon: Brain,         title: "Mock Interview", copy: "5 role-tailored questions with ideal answer frameworks, red flags, and follow-ups." },
            { icon: FileText,      title: "Resume Rewriter", copy: "ATS scoring, missing keywords, and before/after bullet rewrites with metrics-driven impact." },
            { icon: Target,        title: "Score Projections", copy: "See exactly how each roadmap week will lift your readiness — before you start." },
            { icon: Trophy,        title: "Celebration Moments", copy: "Confetti when you finish a week. Progress tracking persisted per session." },
            { icon: Sparkles,      title: "Shareable Profile", copy: "Generate a read-only link to brag about your readiness score and plan." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.05 }}
              className="panel p-5 hover:translate-y-[-2px] transition-transform"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.14)", border: "1px solid rgba(124,58,237,0.3)" }}
              >
                <f.icon className="w-4.5 h-4.5 text-brand-400" style={{ color: "#a78bfa", width: 18, height: 18 }} />
              </div>
              <h3 className="mt-4 font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>
                {f.copy}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 panel-accent p-8 md:p-10 text-center"
        >
          <h3 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ready to see your <span className="gradient-text">readiness score</span>?
          </h3>
          <p className="sub mt-2">Takes under a minute. No sign-up.</p>
          <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
            <Link to="/upload" className="btn-primary btn-lg">
              Upload your resume <ArrowRight className="w-4 h-4" />
            </Link>
            <button onClick={startDemo} className="btn-ghost btn-lg">
              <PlayCircle className="w-4 h-4" /> Try the demo
            </button>
          </div>
        </motion.div>
      </section>
    </>
  );
}
