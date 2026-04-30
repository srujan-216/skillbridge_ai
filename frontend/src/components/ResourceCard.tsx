import { BookOpen, FileText, PlayCircle, Link2, ClipboardCheck } from "lucide-react";
import type { Resource } from "../types";

const ICONS = {
  video: PlayCircle,
  course: BookOpen,
  docs: FileText,
  article: Link2,
  practice: ClipboardCheck,
} as const;

interface Props {
  resource: Resource;
  checked: boolean;
  onToggle: () => void;
}

export function ResourceCard({ resource, checked, onToggle }: Props) {
  const Icon = ICONS[resource.type] ?? Link2;
  return (
    <label
      className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer
        ${checked ? "bg-emerald-500/10 border-emerald-400/30" : "bg-white/5 border-white/10 hover:border-white/25"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 w-4 h-4 accent-brand-500 rounded"
      />
      <Icon className="w-4 h-4 text-brand-300 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-slate-100 break-words">
          {resource.url ? (
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="hover:text-brand-300 underline-offset-2 hover:underline"
            >
              {resource.name}
            </a>
          ) : (
            resource.name
          )}
        </div>
        <div className="sub text-xs mt-0.5 flex items-center gap-2">
          <span className="uppercase tracking-wider">{resource.type}</span>
          {resource.duration && <span>· {resource.duration}</span>}
        </div>
      </div>
    </label>
  );
}
