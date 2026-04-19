export const ctaTokens = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
  tertiary:
    "bg-transparent text-slate-700 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  subtle:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  dangerSoft:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2",
} as const;

export const cardTokens = {
  base: "rounded-xl border border-slate-200",
  radius: "rounded-xl",
  variants: {
    default: "bg-white",
    highlight: "bg-white shadow-sm",
    danger: "border-red-200 bg-red-50",
    ghost: "bg-slate-50",
  },
  padding: {
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  },
  interactive:
    "transition-shadow duration-200 hover:shadow-sm focus-within:ring-2 focus-within:ring-slate-300",
} as const;

export const chipTokens = {
  primary: "bg-slate-100 text-slate-700 border border-slate-200",
  active: "bg-slate-900 text-white border border-slate-900",
} as const;

export const statusTokens = {
  pending: "border border-amber-200 bg-amber-50 text-amber-800",
  success: "border border-slate-300 bg-slate-100 text-slate-800",
  neutral: "border border-slate-200 bg-slate-50 text-slate-700",
  danger: "border border-red-200 bg-red-50 text-red-700",
} as const;

export const inputTokens = {
  base:
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
  readOnly:
    "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300",
} as const;

export const iconButtonToken =
  "rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300";

export const modalTokens = {
  overlay: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4",
  panel:
    "w-full max-h-[90vh] overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl",
} as const;
