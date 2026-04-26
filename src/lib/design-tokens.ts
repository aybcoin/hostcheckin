export const warningTokens = {
  cta:
    "bg-amber-500 text-white hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
  status: "border border-amber-200 bg-amber-50 text-amber-800",
  badge: "border border-amber-200 bg-amber-50 text-amber-700",
  card: "border-amber-200 bg-amber-50",
} as const;

export const infoTokens = {
  cta:
    "bg-sky-600 text-white hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2",
  status: "border border-sky-200 bg-sky-50 text-sky-800",
  badge: "border border-sky-200 bg-sky-50 text-sky-700",
  card: "border-sky-200 bg-sky-50",
} as const;

export const textTokens = {
  title: "text-slate-900",
  body: "text-slate-700",
  muted: "text-slate-600",
  subtle: "text-slate-500",
  inverse: "text-white",
  danger: "text-red-700",
  warning: "text-amber-700",
  success: "text-emerald-700",
  info: "text-sky-700",
} as const;

export const surfaceTokens = {
  app: "bg-slate-50",
  panel: "bg-white",
  subtle: "bg-slate-50",
  muted: "bg-slate-100",
  elevated: "bg-slate-200",
  overlay: "bg-slate-950/60",
} as const;

export const borderTokens = {
  default: "border-slate-200",
  subtle: "border-slate-100",
  strong: "border-slate-300",
  danger: "border-red-200",
  warning: "border-amber-200",
  success: "border-emerald-200",
  info: "border-sky-200",
} as const;

export const stateFillTokens = {
  success: "bg-emerald-100",
  warning: "bg-amber-100",
  danger: "bg-red-100",
  neutral: "bg-slate-200",
} as const;

export const chartTokens = {
  revenue: 'fill-emerald-500',
  revenueStroke: 'stroke-emerald-500',
  expenses: 'fill-red-500',
  expensesStroke: 'stroke-red-500',
  net: 'fill-slate-700',
  netStroke: 'stroke-slate-700',
  axis: 'stroke-slate-300',
  grid: 'stroke-slate-200',
  donutSlices: [
    'stroke-emerald-500',
    'stroke-red-500',
    'stroke-slate-700',
    'stroke-sky-500',
    'stroke-amber-500',
    'stroke-indigo-500',
    'stroke-teal-500',
    'stroke-rose-500',
    'stroke-orange-500',
  ],
} as const;

export const ctaTokens = {
  primary:
    "bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2",
  tertiary:
    "bg-transparent text-slate-600 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  warning: warningTokens.cta,
  subtle:
    "bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-2",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  dangerSoft:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2",
} as const;

export const cardTokens = {
  base: "rounded-xl border border-slate-200",
  elevated: "bg-white shadow-sm shadow-slate-200/60",
  radius: "rounded-xl",
  variants: {
    default: "bg-white",
    highlight: "bg-white shadow-md shadow-slate-200/80",
    danger: "border-red-200 bg-red-50",
    warning: warningTokens.card,
    info: infoTokens.card,
    ghost: "bg-slate-50",
  },
  padding: {
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  },
  interactive:
    "transition-all duration-200 hover:shadow-md hover:shadow-slate-200/70 hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-indigo-200",
} as const;

export const chipTokens = {
  primary: "bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors duration-150",
  active: "bg-indigo-600 text-white border border-indigo-600",
} as const;

export const statusTokens = {
  pending: "border border-amber-200 bg-amber-50 text-amber-800",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border border-slate-200 bg-slate-50 text-slate-700",
  warning: warningTokens.status,
  info: infoTokens.status,
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

/**
 * Couleur accent de la marque HostCheckIn (Indigo).
 * Utiliser pour les éléments de mise en valeur, indicateurs actifs,
 * liens texte et états de sélection.
 */
export const accentTokens = {
  bg: "bg-indigo-600",
  bgLight: "bg-indigo-50",
  bgHover: "hover:bg-indigo-700",
  text: "text-indigo-600",
  textDark: "text-indigo-700",
  border: "border-indigo-300",
  borderLight: "border-indigo-200",
  ring: "ring-indigo-400",
  badge: "border border-indigo-200 bg-indigo-50 text-indigo-700",
  activeNavBorder: "border-indigo-600",
  activeNavText: "text-indigo-700",
} as const;

/**
 * Durées de transition standardisées.
 * Utiliser systématiquement pour garantir une sensation de mouvement cohérente.
 */
export const transitionTokens = {
  fast: "transition-all duration-150 ease-out",
  base: "transition-all duration-200 ease-out",
  slow: "transition-all duration-300 ease-out",
  color: "transition-colors duration-150 ease-out",
  shadow: "transition-shadow duration-200 ease-out",
  transform: "transition-transform duration-200 ease-out",
} as const;
