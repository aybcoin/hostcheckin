export type IcalPlatform = 'airbnb' | 'booking' | 'vrbo' | 'other';

export type IcalSyncStatus = 'running' | 'success' | 'partial' | 'failed';

export const ICAL_PLATFORMS = [
  'airbnb',
  'booking',
  'vrbo',
  'other',
] as const satisfies readonly IcalPlatform[];

export const ICAL_SYNC_STATUSES = [
  'running',
  'success',
  'partial',
  'failed',
] as const satisfies readonly IcalSyncStatus[];

export interface IcalFeed {
  id: string;
  host_id: string;
  property_id: string;
  platform: IcalPlatform;
  ical_url: string;
  display_name: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  last_sync_status: Exclude<IcalSyncStatus, 'running'> | null;
  last_sync_error: string | null;
  last_sync_imported_count: number;
  last_sync_skipped_count: number;
  sync_interval_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IcalFeedWithRelations extends IcalFeed {
  property_name?: string;
  recent_logs?: IcalSyncLog[];
}

export interface IcalSyncLog {
  id: string;
  feed_id: string;
  started_at: string;
  finished_at: string | null;
  status: IcalSyncStatus;
  imported_count: number;
  skipped_count: number;
  error_message: string | null;
  events_summary: Record<string, unknown> | null;
}

export interface IcalFeedCreateInput {
  property_id: string;
  platform: IcalPlatform;
  ical_url: string;
  display_name?: string | null;
  is_active?: boolean;
  sync_interval_minutes?: number;
  notes?: string | null;
}

export interface IcalFeedUpdateInput {
  property_id?: string;
  platform?: IcalPlatform;
  ical_url?: string;
  display_name?: string | null;
  is_active?: boolean;
  sync_interval_minutes?: number;
  notes?: string | null;
}

export interface ParsedIcalEvent {
  uid: string;
  summary?: string;
  dtstart: string;
  dtend: string;
  status?: string;
  raw: Record<string, string>;
}

export interface IcalSyncSummary {
  feedId: string;
  status: IcalSyncStatus;
  importedCount: number;
  skippedCount: number;
  errors: string[];
  eventsCount: number;
  dateRange?: {
    start: string;
    end: string;
  };
}
