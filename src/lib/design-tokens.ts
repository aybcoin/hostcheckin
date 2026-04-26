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
  app: "bg-stone-50",
  panel: "bg-white",
  subtle: "bg-stone-50",
  muted: "bg-stone-100",
  elevated: "bg-stone-200",
  overlay: "bg-stone-950/60 backdrop-blur-sm",
} as const;

export const borderTokens = {
  default: "border-stone-200",
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
    "bg-emerald-700 text-white hover:bg-emerald-800 active:bg-emerald-900 shadow-sm shadow-emerald-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
  secondary:
    "border border-stone-300 bg-white text-slate-800 hover:bg-stone-50 hover:border-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2",
  tertiary:
    "bg-transparent text-slate-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2",
  destructive:
    "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  warning: warningTokens.cta,
  subtle:
    "bg-stone-100 text-slate-700 hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2",
  success:
    "bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
  danger:
    "bg-red-700 text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
  dangerSoft:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2",
} as const;

export const cardTokens = {
  base: "rounded-2xl border border-stone-200",
  elevated: "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-4px_rgba(15,23,42,0.06)]",
  radius: "rounded-2xl",
  variants: {
    default: "bg-white",
    highlight:
      "bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-8px_rgba(15,23,42,0.08)]",
    danger: "border-red-200 bg-red-50",
    warning: warningTokens.card,
    info: infoTokens.card,
    ghost: "bg-stone-50",
  },
  padding: {
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  },
  interactive:
    "transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_2px_4px_rgba(15,23,42,0.04),0_16px_40px_-8px_rgba(15,23,42,0.10)] hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-emerald-200",
} as const;

export const chipTokens = {
  primary:
    "bg-stone-100 text-slate-700 border border-stone-200 hover:bg-stone-200 transition-colors duration-200",
  active: "bg-emerald-700 text-white border border-emerald-700 shadow-sm shadow-emerald-900/10",
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
  bg: "bg-emerald-700",
  bgLight: "bg-emerald-50",
  bgHover: "hover:bg-emerald-800",
  text: "text-emerald-700",
  textDark: "text-emerald-900",
  border: "border-emerald-300",
  borderLight: "border-emerald-200",
  ring: "ring-emerald-400",
  badge: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  activeNavBorder: "border-emerald-700",
  activeNavText: "text-emerald-800",
} as const;

/**
 * Property card embedded at the top of the sidebar — surfaces the current
 * "context" property, its reference, dates and arrival/leaving status.
 * Designed to live on a slate-950 background.
 */
export const sidebarPropertyTokens = {
  card:
    "border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.06] transition-colors duration-200",
  imageFallback:
    "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-slate-200 ring-1 ring-inset ring-white/[0.04]",
  title: "text-white",
  reference: "text-slate-400",
  dates: "text-slate-300 tabular-nums",
  platformAirbnb:
    "border border-rose-400/30 bg-rose-500/15 text-rose-200",
  platformBooking:
    "border border-sky-400/30 bg-sky-500/15 text-sky-200",
  platformDirect:
    "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200",
  platformOther:
    "border border-white/10 bg-white/[0.06] text-slate-200",
  statusArriving:
    "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  statusArrivingDot: "bg-emerald-400",
  statusLeaving:
    "border border-amber-400/30 bg-amber-500/10 text-amber-200",
  statusLeavingDot: "bg-amber-400",
  statusIdle:
    "border border-white/[0.08] bg-white/[0.04] text-slate-300",
  statusIdleDot: "bg-slate-400",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
} as const;

/**
 * Sidebar dark — direction "Payoneer-style" : fond noir bleuté uni,
 * bord-à-bord, navigation directe, accent émeraude.
 */
export const sidebarTokens = {
  shell: "bg-slate-950",
  panel: "bg-slate-950",
  panelBorder: "border-transparent",
  panelShadow: "",
  divider: "border-white/[0.06]",
  brandTile: "bg-emerald-500 text-white",
  brandText: "text-white",
  closeButton:
    "text-slate-400 hover:bg-white/[0.06] hover:text-white",
  focusRing:
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
  navGroupLabel: "text-slate-500",
  navItem:
    "text-slate-300 hover:bg-white/[0.04] hover:text-white",
  navItemActive: "bg-white/[0.06] text-white font-semibold",
  navIcon: "text-slate-500 group-hover:text-slate-200",
  navIconActive: "text-emerald-400",
  navBadge: "bg-rose-500/15 text-rose-300 border border-rose-400/30",
  navBadgeUrgent: "bg-red-500 text-white border border-red-500",
  promoCard:
    "border border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800",
  promoIcon: "bg-white/20 text-white",
  promoTitle: "text-white",
  promoBody: "text-emerald-100/80",
  userPanel: "border-t border-white/[0.06]",
  avatar: "bg-white text-slate-900",
  userName: "text-white",
  userMeta: "text-slate-400",
  logout:
    "text-slate-400 hover:bg-red-500/10 hover:text-red-300",
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
 * Classes typographiques spéciales — Fraunces pour le rendu éditorial.
 */
export const displayTokens = {
  hero: "font-display font-light tracking-tightest-display",
  title: "font-display font-medium tracking-tight",
  number: "font-display font-medium tabular-nums",
} as const;
