import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FileText, UploadCloud, ArrowRight, ShieldCheck, Sparkles,
  RefreshCcw, Pencil, Award, Trophy,
} from "lucide-react";
import { api } from "../lib/api";
import { useStore } from "../store/useStore";
import { LoadingRotator } from "../components/LoadingRotator";
import { SkillPillEditor } from "../components/SkillPillEditor";
import { EmptyIllustration } from "../components/EmptyIllustration";

type Phase = "idle" | "uploading" | "ready" | "manual";

export default function Upload() {
  const nav = useNavigate();
  const { resume, setResume, updateSkills, setIsDemo } = useStore();

  const [phase, setPhase] = useState<Phase>(resume ? "ready" : "idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [manualSkills, setManualSkills] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const skills = resume?.skills ?? [];
  const confidence = resume?.confidence ?? 0;
  const confidencePct = Math.round(confidence * 100);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Please upload a PDF file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File too large — 5 MB limit.");
        return;
      }
      setFileName(file.name);
      setPhase("uploading");
      setIsDemo(false);
      try {
        const r = await api.uploadResume(file);
        setResume(r);
        setPhase("ready");
        if (!r.skills.length) {
          toast("We couldn't find any skills — add them manually below.", { icon: "✏️" });
        } else {
          toast.success(`Extracted ${r.skills.length} skills!`);
        }
      } catch {
        setPhase("manual");
        toast.error("Couldn't parse PDF — switch to manual entry.");
      }
    },
    [setResume, setIsDemo]
  );

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const submitManual = async () => {
    if (!manualSkills.length) return toast.error("Add at least one skill.");
    const r = await api.manualResume(manualSkills, []);
    setResume(r);
    setPhase("ready");
    toast.success("Skills saved — pick a role next!");
  };

  const reset = () => {
    setResume(null);
    setFileName(null);
    setPhase("idle");
  };

  const confidenceColor = useMemo(() => {
    if (confidencePct >= 80) return "text-emerald-300";
    if (confidencePct >= 55) return "text-amber-300";
    return "text-rose-300";
  }, [confidencePct]);

  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14 space-y-8">
      <header className="text-center space-y-3">
        <div className="eyebrow justify-center inline-flex" style={{ color: "var(--brand-1)" }}>
          <Sparkles className="w-3 h-3" /> Step 1 of 3
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Drop your <span className="gradient-text">resume</span>.
        </h1>
        <p className="sub max-w-xl mx-auto">
          PDF only · We'll extract every skill, project, and achievement — and show you confidence per-field.
        </p>
      </header>

      {phase === "idle" && (
        <motion.label
          htmlFor="resume-file"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`block cursor-pointer panel p-10 md:p-16 text-center transition-all relative overflow-hidden
            ${dragOver ? "scale-[1.01]" : ""}`}
          style={dragOver ? { borderColor: "var(--brand-1)", background: "rgba(124,58,237,0.10)" } : undefined}
        >
          <div className="absolute inset-0 pointer-events-none opacity-40"
               style={{
                 backgroundImage:
                   "radial-gradient(circle at 30% 20%, rgba(124,58,237,0.12), transparent 60%),radial-gradient(circle at 80% 80%, rgba(59,130,246,0.10), transparent 60%)",
               }} />
          <input
            id="resume-file" ref={fileRef} type="file"
            accept="application/pdf" className="hidden" onChange={onInputChange}
          />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="relative mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{
              background: "linear-gradient(135deg, var(--brand-1), var(--brand-3))",
              boxShadow: "0 16px 32px -8px rgba(124,58,237,0.4)",
            }}
          >
            <UploadCloud className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="relative mt-5 text-xl md:text-2xl font-bold">Drag & drop your PDF resume</h2>
          <p className="relative sub mt-1">…or click to browse · 5 MB max</p>
          <div className="relative mt-5 inline-flex gap-3 flex-wrap justify-center">
            <span className="btn-primary pointer-events-none">Choose file</span>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); setPhase("manual"); }}
              className="btn-ghost"
            >
              <Pencil className="w-4 h-4" /> Enter skills manually
            </button>
          </div>
        </motion.label>
      )}

      {phase === "uploading" && (
        <div className="panel p-10 text-center space-y-6">
          <FileText className="w-10 h-10 text-brand-300 mx-auto" style={{ color: "#a78bfa" }} />
          <div className="sub truncate">{fileName}</div>
          <LoadingRotator />
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, var(--brand-1), var(--brand-3))" }}
              initial={{ width: "8%" }}
              animate={{ width: ["8%", "40%", "78%", "92%"] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
          </div>
        </div>
      )}

      {phase === "manual" && (
        <div className="panel p-6 md:p-8 space-y-5">
          <div className="flex items-start gap-3">
            <Pencil className="w-5 h-5 mt-1" style={{ color: "#a78bfa" }} />
            <div>
              <h3 className="text-lg font-bold">Manual skill entry</h3>
              <p className="sub">Add what you know — we'll take it from there.</p>
            </div>
          </div>
          <SkillPillEditor skills={manualSkills} onChange={setManualSkills} />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button className="btn-ghost" onClick={() => setPhase("idle")}>
              <RefreshCcw className="w-4 h-4" /> Back to upload
            </button>
            <button className="btn-primary" onClick={submitManual}>
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {phase === "ready" && resume && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="panel-accent p-6 md:p-8">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                  <h3 className="font-bold text-lg">Resume analyzed</h3>
                </div>
                {resume.headline && (
                  <p className="mt-1 text-base" style={{ color: "var(--text)" }}>{resume.headline}</p>
                )}
                <p className="sub mt-1">
                  We're <span className={`font-semibold ${confidenceColor}`}>{confidencePct}%</span>{" "}
                  confident about your extracted skills
                  {resume.years_experience > 0 && (
                    <> · <span style={{ color: "var(--text)" }}>{resume.years_experience}+ yrs exp</span></>
                  )}
                  .
                </p>
              </div>
              <button className="btn-ghost" onClick={reset}>
                <RefreshCcw className="w-4 h-4" /> Upload another
              </button>
            </div>

            <div className="mt-4 h-2 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full"
                style={{ background: "linear-gradient(90deg, var(--brand-1), var(--brand-3))" }}
                initial={{ width: 0 }}
                animate={{ width: `${confidencePct}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>

            {(resume.certifications?.length || resume.achievements?.length) ? (
              <div className="grid sm:grid-cols-2 gap-4 mt-5">
                {resume.certifications?.length > 0 && (
                  <div>
                    <p className="eyebrow mb-2"><Award className="w-3 h-3" /> Certifications</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resume.certifications.map((c, i) => (
                        <span key={i} className="pill">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {resume.achievements?.length > 0 && (
                  <div>
                    <p className="eyebrow mb-2"><Trophy className="w-3 h-3" /> Achievements</p>
                    <ul className="space-y-1 text-sm" style={{ color: "var(--text-dim)" }}>
                      {resume.achievements.slice(0, 4).map((a, i) => (
                        <li key={i} className="flex gap-2"><span className="text-amber-300">•</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">Your skills <span className="sub font-normal">({skills.length})</span></h3>
              <p className="sub hidden md:block">Edit before analysis — add anything missing.</p>
            </div>
            {skills.length === 0 ? (
              <div className="panel">
                <EmptyIllustration
                  title="No skills detected"
                  copy="The resume text didn't mention recognizable skills. Add them below — we'll still do the rest."
                />
                <div className="p-4 pt-0">
                  <SkillPillEditor skills={skills} onChange={updateSkills} />
                </div>
              </div>
            ) : (
              <SkillPillEditor skills={skills} onChange={updateSkills} />
            )}
          </div>

          {resume.projects?.length > 0 && (
            <div>
              <h3 className="font-bold text-lg mb-3">Projects we found</h3>
              <div className="grid md:grid-cols-2 gap-3">
                {resume.projects.slice(0, 4).map((p, i) => (
                  <div key={i} className="panel p-4 text-sm" style={{ color: "var(--text-dim)" }}>
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
            <button className="btn-ghost" onClick={() => setPhase("manual")}>
              <Pencil className="w-4 h-4" /> Add skills manually
            </button>
            <button
              className="btn-primary btn-lg"
              onClick={() => nav("/role")}
              disabled={!skills.length}
            >
              Pick your target role <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
