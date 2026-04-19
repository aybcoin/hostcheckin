export type AppPage =
  | 'dashboard'
  | 'properties'
  | 'reservations'
  | 'checkins'
  | 'calendar'
  | 'contracts'
  | 'profile'
  | 'pricing'
  | 'blacklist'
  | 'help';

export const APP_PAGE_PATHS: Record<AppPage, string> = {
  dashboard: '/',
  properties: '/properties',
  reservations: '/reservations',
  checkins: '/checkins',
  calendar: '/calendar',
  contracts: '/contracts',
  profile: '/profile',
  pricing: '/pricing',
  blacklist: '/blacklist',
  help: '/help',
};
