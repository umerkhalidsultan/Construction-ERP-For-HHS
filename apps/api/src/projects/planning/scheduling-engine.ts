export type ScheduleDependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface ScheduleActivityInput {
  id: string;
  durationDays: number;
  plannedStartDate?: Date | null;
  activityType?: 'TASK' | 'SUMMARY' | 'MILESTONE' | 'LEVEL_OF_EFFORT';
  isManuallyScheduled?: boolean;
}

export interface ScheduleDependencyInput {
  predecessorId: string;
  successorId: string;
  type: ScheduleDependencyType;
  lagDays: number;
}

export interface ScheduledActivity {
  id: string;
  earlyStartDate: Date;
  earlyFinishDate: Date;
  lateStartDate: Date;
  lateFinishDate: Date;
  totalFloatDays: number;
  freeFloatDays: number;
  isCritical: boolean;
  conflict?: string;
}

const DAY_MS = 86_400_000;

function day(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function dateKey(date: Date): string {
  return day(date).toISOString().slice(0, 10);
}

function isWorkingDay(
  date: Date,
  workingDays: Set<number>,
  nonWorkingDates = new Set<string>(),
  workingDateOverrides = new Set<string>(),
): boolean {
  const key = dateKey(date);
  if (workingDateOverrides.has(key)) return true;
  return workingDays.has(date.getUTCDay()) && !nonWorkingDates.has(key);
}

export function addWorkingDays(
  date: Date,
  amount: number,
  workingDays: Set<number>,
  nonWorkingDates = new Set<string>(),
  workingDateOverrides = new Set<string>(),
): Date {
  let cursor = day(date);
  if (amount === 0) {
    while (
      !isWorkingDay(cursor, workingDays, nonWorkingDates, workingDateOverrides)
    )
      cursor = new Date(cursor.getTime() + DAY_MS);
    return cursor;
  }
  const step = amount > 0 ? 1 : -1;
  let remaining = Math.abs(amount);
  while (remaining > 0) {
    cursor = new Date(cursor.getTime() + step * DAY_MS);
    if (
      isWorkingDay(cursor, workingDays, nonWorkingDates, workingDateOverrides)
    )
      remaining -= 1;
  }
  return cursor;
}

export function workingDayDistance(
  from: Date,
  to: Date,
  workingDays: Set<number>,
  nonWorkingDates = new Set<string>(),
  workingDateOverrides = new Set<string>(),
): number {
  if (day(from).getTime() === day(to).getTime()) return 0;
  const direction = from < to ? 1 : -1;
  let cursor = day(from);
  let distance = 0;
  while (cursor.getTime() !== day(to).getTime()) {
    cursor = new Date(cursor.getTime() + direction * DAY_MS);
    if (
      isWorkingDay(cursor, workingDays, nonWorkingDates, workingDateOverrides)
    )
      distance += direction;
  }
  return distance;
}

function edgeOffset(
  type: ScheduleDependencyType,
  predecessorDuration: number,
  successorDuration: number,
  lag: number,
): number {
  switch (type) {
    case 'SS':
      return lag;
    case 'FF':
      return predecessorDuration - successorDuration + lag;
    case 'SF':
      return -successorDuration + lag;
    case 'FS':
    default:
      return predecessorDuration + lag;
  }
}

export function calculateSchedule(
  activities: ScheduleActivityInput[],
  dependencies: ScheduleDependencyInput[],
  projectStart: Date,
  workingDayNumbers: number[] = [1, 2, 3, 4, 5],
  nonWorkingDateValues: Date[] = [],
  workingDateOverrideValues: Date[] = [],
): ScheduledActivity[] {
  const workingDays = new Set(workingDayNumbers);
  const nonWorkingDates = new Set(nonWorkingDateValues.map(dateKey));
  const workingDateOverrides = new Set(workingDateOverrideValues.map(dateKey));
  if (!workingDays.size)
    throw new Error('A schedule requires at least one working day');
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  const duration = (id: string) => {
    const activity = byId.get(id)!;
    return activity.activityType === 'MILESTONE'
      ? 0
      : Math.max(1, activity.durationDays);
  };
  const incoming = new Map<string, ScheduleDependencyInput[]>();
  const outgoing = new Map<string, ScheduleDependencyInput[]>();
  const indegree = new Map(activities.map((activity) => [activity.id, 0]));
  for (const edge of dependencies) {
    if (!byId.has(edge.predecessorId) || !byId.has(edge.successorId)) {
      throw new Error(
        'Dependency references an activity outside this schedule',
      );
    }
    if (edge.predecessorId === edge.successorId)
      throw new Error('An activity cannot depend on itself');
    incoming.set(edge.successorId, [
      ...(incoming.get(edge.successorId) ?? []),
      edge,
    ]);
    outgoing.set(edge.predecessorId, [
      ...(outgoing.get(edge.predecessorId) ?? []),
      edge,
    ]);
    indegree.set(edge.successorId, (indegree.get(edge.successorId) ?? 0) + 1);
  }

  const queue = activities
    .filter((activity) => indegree.get(activity.id) === 0)
    .map((activity) => activity.id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      const next = (indegree.get(edge.successorId) ?? 0) - 1;
      indegree.set(edge.successorId, next);
      if (next === 0) queue.push(edge.successorId);
    }
  }
  if (order.length !== activities.length)
    throw new Error('Circular dependency detected');

  const earlyStart = new Map<string, Date>();
  const conflicts = new Map<string, string>();
  for (const id of order) {
    const activity = byId.get(id)!;
    let constrained = addWorkingDays(
      activity.plannedStartDate ?? projectStart,
      0,
      workingDays,
      nonWorkingDates,
      workingDateOverrides,
    );
    for (const edge of incoming.get(id) ?? []) {
      const predecessorStart = earlyStart.get(edge.predecessorId)!;
      const candidate = addWorkingDays(
        predecessorStart,
        edgeOffset(
          edge.type,
          duration(edge.predecessorId),
          duration(id),
          edge.lagDays,
        ),
        workingDays,
        nonWorkingDates,
        workingDateOverrides,
      );
      if (candidate > constrained) constrained = candidate;
    }
    if (activity.isManuallyScheduled && activity.plannedStartDate) {
      const locked = addWorkingDays(
        activity.plannedStartDate,
        0,
        workingDays,
        nonWorkingDates,
        workingDateOverrides,
      );
      if (locked < constrained)
        conflicts.set(id, 'Locked date conflicts with a predecessor');
      earlyStart.set(id, locked);
    } else {
      earlyStart.set(id, constrained);
    }
  }

  let scheduleFinish = addWorkingDays(
    projectStart,
    0,
    workingDays,
    nonWorkingDates,
    workingDateOverrides,
  );
  for (const id of order) {
    const finish = addWorkingDays(
      earlyStart.get(id)!,
      Math.max(0, duration(id) - 1),
      workingDays,
      nonWorkingDates,
      workingDateOverrides,
    );
    if (finish > scheduleFinish) scheduleFinish = finish;
  }

  const lateStart = new Map<string, Date>();
  for (const id of [...order].reverse()) {
    let latest = addWorkingDays(
      scheduleFinish,
      -Math.max(0, duration(id) - 1),
      workingDays,
      nonWorkingDates,
      workingDateOverrides,
    );
    for (const edge of outgoing.get(id) ?? []) {
      const successorLate = lateStart.get(edge.successorId)!;
      const candidate = addWorkingDays(
        successorLate,
        -edgeOffset(
          edge.type,
          duration(id),
          duration(edge.successorId),
          edge.lagDays,
        ),
        workingDays,
        nonWorkingDates,
        workingDateOverrides,
      );
      if (candidate < latest) latest = candidate;
    }
    lateStart.set(id, latest);
  }

  return order.map((id) => {
    const start = earlyStart.get(id)!;
    const finish = addWorkingDays(
      start,
      Math.max(0, duration(id) - 1),
      workingDays,
      nonWorkingDates,
      workingDateOverrides,
    );
    const late = lateStart.get(id)!;
    const lateFinish = addWorkingDays(
      late,
      Math.max(0, duration(id) - 1),
      workingDays,
      nonWorkingDates,
      workingDateOverrides,
    );
    const totalFloatDays = workingDayDistance(
      start,
      late,
      workingDays,
      nonWorkingDates,
      workingDateOverrides,
    );
    const successorFloats = (outgoing.get(id) ?? []).map((edge) => {
      const required = addWorkingDays(
        start,
        edgeOffset(
          edge.type,
          duration(id),
          duration(edge.successorId),
          edge.lagDays,
        ),
        workingDays,
        nonWorkingDates,
        workingDateOverrides,
      );
      return workingDayDistance(
        required,
        earlyStart.get(edge.successorId)!,
        workingDays,
        nonWorkingDates,
        workingDateOverrides,
      );
    });
    const freeFloatDays = successorFloats.length
      ? Math.min(...successorFloats)
      : totalFloatDays;
    return {
      id,
      earlyStartDate: start,
      earlyFinishDate: finish,
      lateStartDate: late,
      lateFinishDate: lateFinish,
      totalFloatDays,
      freeFloatDays,
      isCritical: totalFloatDays <= 0,
      conflict: conflicts.get(id),
    };
  });
}
