export type AppPage =
  | 'dashboard'
  | 'properties'
  | 'reservations'
  | 'checkins'
  | 'automations'
  | 'calendar'
  | 'contracts'
  | 'housekeeping'
  | 'maintenance'
  | 'linen'
  | 'finance'
  | 'inventory'
  | 'ical'
  | 'pricing-engine'
  | 'profile'
  | 'settings'
  | 'pricing'
  | 'rentiq'
  | 'blacklist'
  | 'help'
  | 'security';

export const APP_PAGE_PATHS: Record<AppPage, string> = {
  dashboard: '/',
  properties: '/properties',
  reservations: '/reservations',
  checkins: '/checkins',
  automations: '/automatisations',
  calendar: '/calendar',
  contracts: '/contracts',
  housekeeping: '/menage',
  maintenance: '/maintenance',
  linen: '/linge',
  finance: '/finance',
  inventory: '/inventaire',
  ical: '/calendriers',
  'pricing-engine': '/tarification',
  profile: '/profil',
  settings: '/parametres',
  pricing: '/pricing',
  rentiq: '/rentiq',
  blacklist: '/blacklist',
  help: '/help',
  security: '/securite',
};
