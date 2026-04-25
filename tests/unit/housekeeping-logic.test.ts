import { describe, expect, it } from 'vitest';
import {
  computeChecklistProgress,
  computeHousekeepingSummary,
  computeHousekeepingToday,
  computeTaskPriority,
  isPropertyReady,
  isTaskReady,
  nextStatusFor,
} from '../../src/lib/housekeeping-logic';
import type {
  HousekeepingChecklistItem,
  HousekeepingTaskWithRelations,
} from '../../src/types/housekeeping';

const NOW_ISO = '2026-04-22T10:00:00Z';
const NOW = new Date(NOW_ISO);
const DAY_MS = 24 * 60 * 60 * 1000;

function dateOnly(days: number): string {
  return new Date(Date.parse(NOW_ISO) + days * DAY_MS).toISOString().slice(0, 10);
}

function makeTask(overrides: Partial<HousekeepingTaskWithRelations> = {}): HousekeepingTaskWithRelations {
  return {
    id: 'task-1',
    host_id: 'host-1',
    property_id: 'prop-1',
    reservation_id: 'res-1',
    status: 'pending',
    priority: 'normal',
    scheduled_for: dateOnly(0),
    due_before: null,
    assigned_to: null,
    notes: null,
    issue_note: null,
    photos_urls: [],
    started_at: null,
    completed_at: null,
    validated_at: null,
    created_at: NOW_ISO,
    updated_at: NOW_ISO,
    property_name: 'Apt Centre',
    guest_name: 'Alice',
    next_check_in_date: null,
    checklist: [],
    ...overrides,
  };
}

function makeChecklistItem(
  overrides: Partial<HousekeepingChecklistItem> = {},
): HousekeepingChecklistItem {
  return {
    id: 'item-1',
    task_id: 'task-1',
    label_key: 'aerate',
    custom_label: null,
    is_done: false,
    position: 1,
    done_at: null,
    created_at: NOW_ISO,
    ...overrides,
  };
}

describe('computeTaskPriority', () => {
  it('returns critical on same-day turnover', () => {
    const task = makeTask({
      scheduled_for: dateOnly(1),
      next_check_in_date: dateOnly(1),
    });
    expect(computeTaskPriority(task, NOW)).toBe('critical');
  });

  it('returns high when next arrival is within 1 day after checkout', () => {
    const task = makeTask({
      scheduled_for: dateOnly(2),
      next_check_in_date: dateOnly(3),
    });
    expect(computeTaskPriority(task, NOW)).toBe('high');
  });

  it('returns critical for overdue open task', () => {
    const task = makeTask({ scheduled_for: dateOnly(-1), status: 'pending' });
    expect(computeTaskPriority(task, NOW)).toBe('critical');
  });

  it('returns normal for future task with no next arrival', () => {
    const task = makeTask({ scheduled_for: dateOnly(5) });
    expect(computeTaskPriority(task, NOW)).toBe('normal');
  });

  it('returns critical when an issue is reported, regardless of date', () => {
    const task = makeTask({ scheduled_for: dateOnly(7), status: 'issue_reported' });
    expect(computeTaskPriority(task, NOW)).toBe('critical');
  });
});

describe('computeChecklistProgress', () => {
  it('returns 0/0/0 for empty checklist', () => {
    expect(computeChecklistProgress([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('counts and rounds percentage', () => {
    const items = [
      makeChecklistItem({ id: 'a', is_done: true }),
      makeChecklistItem({ id: 'b', is_done: true }),
      makeChecklistItem({ id: 'c', is_done: false }),
    ];
    expect(computeChecklistProgress(items)).toEqual({ done: 2, total: 3, pct: 67 });
  });
});

describe('isTaskReady / isPropertyReady', () => {
  it('isTaskReady true only when status done AND every checklist item is done', () => {
    expect(isTaskReady(makeTask({ status: 'completed' }))).toBe(true);
    expect(
      isTaskReady(
        makeTask({
          status: 'completed',
          checklist: [makeChecklistItem({ is_done: false })],
        }),
      ),
    ).toBe(false);
    expect(
      isTaskReady(
        makeTask({
          status: 'validated',
          checklist: [makeChecklistItem({ is_done: true })],
        }),
      ),
    ).toBe(true);
  });

  it('isTaskReady false when not in done status', () => {
    expect(isTaskReady(makeTask({ status: 'in_progress' }))).toBe(false);
  });

  it('isPropertyReady true when no past/today task is open', () => {
    const tasks = [
      makeTask({ id: 't1', scheduled_for: dateOnly(-1), status: 'completed' }),
      makeTask({ id: 't2', scheduled_for: dateOnly(3), status: 'pending' }),
    ];
    expect(isPropertyReady('prop-1', tasks, NOW)).toBe(true);
  });

  it('isPropertyReady false when an overdue task is still open', () => {
    const tasks = [
      makeTask({ id: 't1', scheduled_for: dateOnly(-1), status: 'pending' }),
    ];
    expect(isPropertyReady('prop-1', tasks, NOW)).toBe(false);
  });

  it('isPropertyReady ignores tasks of other properties', () => {
    const tasks = [
      makeTask({ id: 't1', property_id: 'other', scheduled_for: dateOnly(-1), status: 'pending' }),
    ];
    expect(isPropertyReady('prop-1', tasks, NOW)).toBe(true);
  });
});

describe('computeHousekeepingToday', () => {
  it('includes today and overdue-open tasks, ranks critical first', () => {
    const tasks = [
      makeTask({ id: 'a', scheduled_for: dateOnly(0), priority: 'normal', status: 'pending' }),
      makeTask({
        id: 'b',
        scheduled_for: dateOnly(-1),
        priority: 'normal',
        status: 'pending',
      }),
      makeTask({ id: 'c', scheduled_for: dateOnly(2), priority: 'normal', status: 'pending' }),
    ];
    const today = computeHousekeepingToday(tasks, NOW);
    expect(today.map((entry) => entry.taskId)).toEqual(['b', 'a']);
  });

  it('respects the limit', () => {
    const tasks = Array.from({ length: 8 }, (_, idx) =>
      makeTask({ id: `t-${idx}`, scheduled_for: dateOnly(0), status: 'pending' }),
    );
    expect(computeHousekeepingToday(tasks, NOW, 3)).toHaveLength(3);
  });

  it('skips done tasks scheduled in the past', () => {
    const tasks = [
      makeTask({ id: 'a', scheduled_for: dateOnly(-2), status: 'validated' }),
    ];
    expect(computeHousekeepingToday(tasks, NOW)).toEqual([]);
  });
});

describe('computeHousekeepingSummary', () => {
  it('counts buckets correctly', () => {
    const tasks = [
      makeTask({ id: '1', status: 'pending', scheduled_for: dateOnly(0) }),
      makeTask({ id: '2', status: 'in_progress', scheduled_for: dateOnly(0) }),
      makeTask({ id: '3', status: 'completed', scheduled_for: dateOnly(-1) }),
      makeTask({ id: '4', status: 'pending', scheduled_for: dateOnly(-2) }),
      makeTask({
        id: '5',
        status: 'pending',
        scheduled_for: dateOnly(0),
        next_check_in_date: dateOnly(0),
      }),
    ];
    const summary = computeHousekeepingSummary(tasks, NOW);
    expect(summary.total).toBe(5);
    expect(summary.pending).toBe(3);
    expect(summary.inProgress).toBe(1);
    expect(summary.done).toBe(1);
    expect(summary.overdue).toBe(1);
    expect(summary.criticalToday).toBe(1);
  });
});

describe('nextStatusFor', () => {
  it('start -> in_progress only from pending/assigned', () => {
    expect(nextStatusFor({ status: 'pending' }, 'start')).toBe('in_progress');
    expect(nextStatusFor({ status: 'assigned' }, 'start')).toBe('in_progress');
    expect(nextStatusFor({ status: 'completed' }, 'start')).toBeNull();
  });

  it('complete -> completed from open statuses', () => {
    expect(nextStatusFor({ status: 'in_progress' }, 'complete')).toBe('completed');
    expect(nextStatusFor({ status: 'pending' }, 'complete')).toBe('completed');
    expect(nextStatusFor({ status: 'validated' }, 'complete')).toBeNull();
  });

  it('validate -> validated only from completed', () => {
    expect(nextStatusFor({ status: 'completed' }, 'validate')).toBe('validated');
    expect(nextStatusFor({ status: 'pending' }, 'validate')).toBeNull();
  });

  it('reopen -> in_progress from completed/validated/issue_reported', () => {
    expect(nextStatusFor({ status: 'completed' }, 'reopen')).toBe('in_progress');
    expect(nextStatusFor({ status: 'validated' }, 'reopen')).toBe('in_progress');
    expect(nextStatusFor({ status: 'pending' }, 'reopen')).toBeNull();
  });

  it('reportIssue -> issue_reported, except validated', () => {
    expect(nextStatusFor({ status: 'pending' }, 'reportIssue')).toBe('issue_reported');
    expect(nextStatusFor({ status: 'in_progress' }, 'reportIssue')).toBe('issue_reported');
    expect(nextStatusFor({ status: 'validated' }, 'reportIssue')).toBeNull();
  });
});
