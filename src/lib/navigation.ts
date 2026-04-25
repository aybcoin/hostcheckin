export type AppPage =
  | 'dashboard'
  | 'properties'
  | 'reservations'
  | 'checkins'
  | 'automations'
  | 'calendar'
  | 'contracts'
  | 'housekeeping'
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
  profile: '/profil',
  settings: '/parametres',
  pricing: '/pricing',
  rentiq: '/rentiq',
  blacklist: '/blacklist',
  help: '/help',
  security: '/securite',
};
