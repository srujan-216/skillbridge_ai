import { useState } from "react";
import { Copy, Check, Github, Rocket } from "lucide-react";
import toast from "react-hot-toast";
import type { RoadmapProject } from "../types";

interface Props {
  project: RoadmapProject;
  focus: string;
  checked: boolean;
  onToggle: () => void;
}

export function ProjectCard({ project, focus, checked, onToggle }: Props) {
  const [copied, setCopied] = useState(false);

  const starter = `# ${project.title || `${focus} mini-project`}

${project.description || `Ship an end-to-end project that showcases ${focus}.`}

## Suggested steps
1. Scaffold a minimal repo.
2. Implement the core feature using ${focus}.
3. Add a README + a short GIF demo.
4. Push to GitHub and link it from your resume.

Starter / reference: ${project.github_starter || "https://github.com/"}
`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(starter);
      setCopied(true);
      toast.success("Starter copied — paste into your repo!");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Clipboard blocked — select and copy manually.");
    }
  }

  return (
    <div
      className={`relative rounded-xl p-4 border transition-all
        ${checked ? "bg-emerald-500/10 border-emerald-400/30" : "bg-gradient-to-br from-brand-700/20 to-indigo2-600/10 border-white/10"}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-brand flex items-center justify-center shrink-0">
          <Rocket className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-brand-300">Project</p>
              <h5 className="font-semibold">{project.title || `Ship a ${focus} project`}</h5>
            </div>
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={onToggle}
                className="w-4 h-4 accent-brand-500"
              />
              <span className="sub">Done</span>
            </label>
          </div>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            {project.description || `Apply ${focus} end-to-end and publish a small demo repo.`}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <button onClick={copy} className="btn-ghost !py-1.5 !px-3 text-xs">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy starter code"}
            </button>
            {project.github_starter && (
              <a
                href={project.github_starter}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost !py-1.5 !px-3 text-xs"
              >
                <Github className="w-3.5 h-3.5" /> Starter repo
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
