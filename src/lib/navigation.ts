export type AppPage =
  | 'dashboard'
  | 'properties'
  | 'reservations'
  | 'checkins'
  | 'automations'
  | 'calendar'
  | 'contracts'
  | 'profile'
  | 'pricing'
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
  profile: '/profile',
  pricing: '/pricing',
  blacklist: '/blacklist',
  help: '/help',
  security: '/securite',
};
