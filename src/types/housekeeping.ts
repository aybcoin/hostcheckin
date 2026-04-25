export type HousekeepingStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'validated'
  | 'issue_reported';

export type HousekeepingPriority = 'normal' | 'high' | 'critical';

export const DEFAULT_CHECKLIST_LABEL_KEYS = [
  'aerate',
  'remove_trash',
  'change_sheets',
  'change_towels',
  'clean_kitchen',
  'clean_bathroom',
  'clean_floors',
  'check_fridge',
  'check_consumables',
  'check_damages',
  'check_remotes_keys',
  'final_photos',
] as const;

export type HousekeepingChecklistLabelKey = (typeof DEFAULT_CHECKLIST_LABEL_KEYS)[number] | (string & {});

export interface HousekeepingChecklistItem {
  id: string;
  task_id: string;
  label_key: HousekeepingChecklistLabelKey;
  custom_label: string | null;
  is_done: boolean;
  position: number;
  done_at: string | null;
  created_at: string;
}

export interface HousekeepingTask {
  id: string;
  host_id: string;
  property_id: string;
  reservation_id: string | null;
  status: HousekeepingStatus;
  priority: HousekeepingPriority;
  scheduled_for: string;
  due_before: string | null;
  assigned_to: string | null;
  notes: string | null;
  issue_note: string | null;
  photos_urls: string[];
  started_at: string | null;
  completed_at: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface HousekeepingTaskWithRelations extends HousekeepingTask {
  property_name?: string;
  guest_name?: string;
  next_check_in_date?: string | null;
  checklist?: HousekeepingChecklistItem[];
}

export interface HousekeepingTaskCreateInput {
  property_id: string;
  reservation_id?: string | null;
  scheduled_for: string;
  priority?: HousekeepingPriority;
  due_before?: string | null;
  assigned_to?: string | null;
  notes?: string | null;
}

export interface ChecklistProgress {
  done: number;
  total: number;
  pct: number;
}
