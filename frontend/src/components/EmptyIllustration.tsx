import { motion } from "framer-motion";

export function EmptyIllustration({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="text-center py-10 px-4">
      <motion.svg
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        viewBox="0 0 200 160"
        className="mx-auto w-40 h-32"
        aria-hidden
      >
        <defs>
          <linearGradient id="empty-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6D28D9" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="85" r="55" fill="url(#empty-g)" opacity="0.22" />
        <rect x="55" y="50" width="90" height="70" rx="10" fill="url(#empty-g)" opacity="0.8" />
        <rect x="65" y="62" width="70" height="6" rx="3" fill="white" opacity="0.9" />
        <rect x="65" y="76" width="50" height="6" rx="3" fill="white" opacity="0.7" />
        <rect x="65" y="90" width="60" height="6" rx="3" fill="white" opacity="0.5" />
        <circle cx="150" cy="50" r="12" fill="#fbbf24" />
        <path d="M146 50 L149 53 L155 46" stroke="white" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </motion.svg>
      <h3 className="mt-4 font-semibold text-lg">{title}</h3>
      <p className="sub mt-1 max-w-sm mx-auto text-sm">{copy}</p>
    </div>
  );
}
