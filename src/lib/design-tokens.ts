/**
 * HostCheckIn — Design tokens
 *
 * Direction: "Hospitality Editorial" — luxe sobre inspiré des marques d'hôtellerie
 * de prestige (Aman, Soho House, Aesop). Crème chaud + émeraude profond +
 * Plus Jakarta Sans (corps) + Fraunces (display sérif éditorial).
 *
 * Règles :
 * - 0 couleur hardcodée hors de ce fichier.
 * - Palette stone (chaude) pour surfaces/bordures, slate pour texte.
 * - Émeraude pour la marque (actions primaires, éléments actifs).
 */

export const warningTokens = {
  cta:
    "bg-amber-600 text-white hover:bg-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2",
  status: "border border-amber-200 bg-amber-50 text-amber-800",
  badge: "border border-amber-200 bg-amber-50 text-amber-700",
  card: "border-amber-200 bg-amber-50",
} as const;

export const infoTokens = {
  cta:
    "bg-sky-700 text-white hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2",
  status: "border border-sky-200 bg-sky-50 text-sky-800",
  badge: "border border-sky-200 bg-sky-50 text-sky-700",
  card: "border-sky-200 bg-sky-50",
} as const;

export const textTokens = {
  title: "text-stone-900",
  body: "text-stone-700",
  muted: "text-stone-500",
  subtle: "text-stone-400",
  inverse: "text-white",
  danger: "text-red-700",
  warning: "text-amber-700",
  success: "text-emerald-700",
  info: "text-sky-700",
} as const;

export const surfaceTokens = {
  app: "bg-[#FAFAF7]",
  panel: "bg-white",
  subtle: "bg-stone-50",
  muted: "bg-stone-100",
  elevated: "bg-white",
  overlay: "bg-stone-950/40 backdrop-blur-sm",
} as const;

export const borderTokens = {
  default: "border-stone-200/80",
  subtle: "border-stone-100",
  strong: "border-stone-300",
  danger: "border-red-200",
  warning: "border-amber-200",
  success: "border-emerald-200",
  info: "border-sky-200",
} as const;

export const stateFillTokens = {
  success: "bg-emerald-100",
  warning: "bg-amber-100",
  danger: "bg-red-100",
  neutral: "bg-stone-200",
} as const;

export const chartTokens = {
  revenue: 'fill-emerald-600',
  revenueStroke: 'stroke-emerald-600',
  expenses: 'fill-red-500',
  expensesStroke: 'stroke-red-500',
  net: 'fill-slate-700',
  netStroke: 'stroke-slate-700',
  axis: 'stroke-stone-300',
  grid: 'stroke-stone-200',
  donutSlices: [
    'stroke-emerald-600',
    'stroke-red-500',
    'stroke-slate-700',
    'stroke-amber-500',
    'stroke-sky-500',
    'stroke-stone-500',
    'stroke-teal-500',
    'stroke-rose-500',
    'stroke-orange-500',
  ],
} as const;

export const ctaTokens = {
  primary:
    "bg-stone-900 text-white hover:bg-stone-800 active:bg-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2",
  secondary:
    "border border-stone-200/80 bg-white text-stone-800 hover:bg-stone-50 hover:border-stone-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2",
  tertiary:
    "bg-transparent text-stone-600 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  warning: warningTokens.cta,
  subtle:
    "bg-stone-100 text-stone-700 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-300 focus-visible:ring-offset-2",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  dangerSoft:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2",
} as const;

export const cardTokens = {
  base: "rounded-xl border border-stone-200/80",
  elevated: "bg-white",
  radius: "rounded-xl",
  variants: {
    default: "bg-white",
    highlight: "bg-white ring-1 ring-stone-200/80",
    danger: "border-red-200 bg-red-50",
    warning: warningTokens.card,
    info: infoTokens.card,
    ghost: "bg-stone-50",
  },
  padding: {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  },
  interactive:
    "transition-colors duration-150 hover:border-stone-300 focus-within:ring-2 focus-within:ring-stone-200",
} as const;

export const chipTokens = {
  primary:
    "bg-white text-stone-700 border border-stone-200/80 hover:bg-stone-50 transition-colors duration-150",
  active: "bg-stone-900 text-white border border-stone-900",
} as const;

export const statusTokens = {
  pending: "border border-amber-200 bg-amber-50 text-amber-800",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  neutral: "border border-stone-200 bg-stone-50 text-slate-700",
  warning: warningTokens.status,
  info: infoTokens.status,
  danger: "border border-red-200 bg-red-50 text-red-700",
} as const;

export const inputTokens = {
  base:
    "w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors duration-200 focus-visible:outline-none focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-200",
  readOnly:
    "w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
} as const;

export const iconButtonToken =
  "rounded-lg p-2 text-slate-600 transition-colors duration-200 hover:bg-stone-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2";

export const modalTokens = {
  overlay:
    "fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 backdrop-blur-sm p-4 animate-in fade-in duration-200",
  panel:
    "w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-[0_24px_64px_-12px_rgba(15,23,42,0.25)]",
} as const;

/**
 * Couleur accent de la marque HostCheckIn — Émeraude profond (Hospitality).
 * Utiliser pour les actions primaires, éléments actifs, indicateurs sélectionnés.
 */
export const accentTokens = {
  bg: "bg-stone-900",
  bgLight: "bg-stone-100",
  bgHover: "hover:bg-stone-800",
  text: "text-stone-900",
  textDark: "text-stone-900",
  border: "border-stone-300",
  borderLight: "border-stone-200",
  ring: "ring-stone-400",
  badge: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  activeNavBorder: "border-emerald-600",
  activeNavText: "text-stone-900",
} as const;

/**
 * Property card embedded at the top of the sidebar — surfaces the current
 * "context" property, its reference, dates and arrival/leaving status.
 * Designed to live on a slate-950 background.
 */
export const sidebarPropertyTokens = {
  card:
    "border border-stone-200/80 bg-white hover:bg-stone-50 transition-colors duration-150",
  imageFallback:
    "bg-stone-100 text-stone-500 ring-1 ring-inset ring-stone-200",
  title: "text-stone-900",
  reference: "text-stone-400",
  dates: "text-stone-600 tabular-nums",
  platformAirbnb:
    "border border-rose-200 bg-rose-50 text-rose-700",
  platformBooking:
    "border border-sky-200 bg-sky-50 text-sky-700",
  platformDirect:
    "border border-emerald-200 bg-emerald-50 text-emerald-700",
  platformOther:
    "border border-stone-200 bg-stone-50 text-stone-700",
  statusArriving:
    "border border-emerald-200 bg-emerald-50 text-emerald-700",
  statusArrivingDot: "bg-emerald-500",
  statusLeaving:
    "border border-amber-200 bg-amber-50 text-amber-700",
  statusLeavingDot: "bg-amber-500",
  statusIdle:
    "border border-stone-200 bg-stone-50 text-stone-600",
  statusIdleDot: "bg-stone-400",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7]",
} as const;

/**
 * Sidebar dark — direction "Payoneer-style" : fond noir bleuté uni,
 * bord-à-bord, navigation directe, accent émeraude.
 */
export const sidebarTokens = {
  shell: "bg-[#FAFAF7] border-r border-stone-200/80",
  panel: "bg-[#FAFAF7]",
  panelBorder: "border-stone-200/80",
  panelShadow: "",
  divider: "border-stone-200/80",
  brandTile: "bg-emerald-600 text-white",
  brandText: "text-stone-900",
  closeButton:
    "text-stone-500 hover:bg-stone-100 hover:text-stone-900",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7]",
  navGroupLabel: "text-stone-400",
  navItem:
    "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
  navItemActive: "bg-white text-stone-900 font-medium shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-stone-200/80",
  navIcon: "text-stone-400 group-hover:text-stone-700",
  navIconActive: "text-stone-900",
  navBadge: "bg-stone-100 text-stone-700 border border-stone-200",
  navBadgeUrgent: "bg-red-500 text-white border border-red-500",
  promoCard:
    "border border-stone-200/80 bg-white",
  promoIcon: "bg-stone-100 text-stone-700",
  promoTitle: "text-stone-900",
  promoBody: "text-stone-500",
  userPanel: "border-t border-stone-200/80",
  avatar: "bg-stone-900 text-white",
  userName: "text-stone-900",
  userMeta: "text-stone-500",
  logout:
    "text-stone-500 hover:bg-red-50 hover:text-red-700",
  mobileTopBar: "bg-white/95 backdrop-blur-md",
} as const;

/**
 * Accent secondaire — Or chaud (champagne) pour moments éditoriaux,
 * badges premium, ratings, distinctions.
 */
export const goldTokens = {
  text: "text-amber-700",
  bg: "bg-amber-600",
  bgLight: "bg-amber-50",
  badge: "border border-amber-200 bg-amber-50 text-amber-800",
} as const;

/**
 * Durées de transition — courbes refined (cubic-bezier expo-out).
 */
export const transitionTokens = {
  fast: "transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
  base: "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  slow: "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
  color: "transition-colors duration-200 ease-out",
  shadow: "transition-shadow duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  transform: "transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
} as const;

/**
 * Dashboard KPI / Operations card tone tiles — colored icon backgrounds + icon tints.
 * Tones: violet, sky, emerald, rose, amber.
 */
export const dashboardToneTokens = {
  violet: { tile: "bg-violet-100 text-violet-700", icon: "text-violet-600" },
  sky:    { tile: "bg-sky-100 text-sky-700",       icon: "text-sky-600"    },
  emerald:{ tile: "bg-emerald-100 text-emerald-700", icon: "text-emerald-600" },
  rose:   { tile: "bg-rose-100 text-rose-700",     icon: "text-rose-600"   },
  amber:  { tile: "bg-amber-100 text-amber-700",   icon: "text-amber-600"  },
} as const;

/**
 * Dashboard timeline / priorities left-rail color bands.
 */
export const dashboardRailTokens = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger:  "bg-red-400",
  info:    "bg-sky-400",
  neutral: "bg-stone-300",
} as const;

/**
 * Classes typographiques spéciales — Fraunces pour le rendu éditorial.
 */
export const displayTokens = {
  hero: "font-sans font-semibold tracking-tightest-display",
  title: "font-sans font-semibold tracking-tight",
  number: "font-sans font-semibold tabular-nums tracking-tight",
} as const;
