import { calculateSchedule } from './scheduling-engine';

describe('calculateSchedule', () => {
  const monday = new Date('2026-08-17T00:00:00.000Z');

  it('propagates finish-to-start dependencies and lag over working days', () => {
    const result = calculateSchedule(
      [
        { id: 'a', durationDays: 2 },
        { id: 'b', durationDays: 1 },
      ],
      [{ predecessorId: 'a', successorId: 'b', type: 'FS', lagDays: 1 }],
      monday,
    );
    expect(
      result
        .find((item) => item.id === 'a')
        ?.earlyFinishDate.toISOString()
        .slice(0, 10),
    ).toBe('2026-08-18');
    expect(
      result
        .find((item) => item.id === 'b')
        ?.earlyStartDate.toISOString()
        .slice(0, 10),
    ).toBe('2026-08-20');
  });

  it('rejects circular dependencies', () => {
    expect(() =>
      calculateSchedule(
        [
          { id: 'a', durationDays: 1 },
          { id: 'b', durationDays: 1 },
        ],
        [
          { predecessorId: 'a', successorId: 'b', type: 'FS', lagDays: 0 },
          { predecessorId: 'b', successorId: 'a', type: 'FS', lagDays: 0 },
        ],
        monday,
      ),
    ).toThrow('Circular dependency');
  });

  it('keeps milestones at zero duration', () => {
    const [milestone] = calculateSchedule(
      [{ id: 'm', durationDays: 0, activityType: 'MILESTONE' }],
      [],
      monday,
    );
    expect(milestone.earlyFinishDate).toEqual(milestone.earlyStartDate);
  });

  it('skips project holidays and accepts working-day overrides', () => {
    const result = calculateSchedule(
      [
        { id: 'a', durationDays: 2 },
        { id: 'b', durationDays: 1 },
      ],
      [{ predecessorId: 'a', successorId: 'b', type: 'FS', lagDays: 0 }],
      monday,
      [1, 2, 3, 4, 5],
      [new Date('2026-08-18T00:00:00.000Z')],
    );
    expect(
      result
        .find((item) => item.id === 'a')
        ?.earlyFinishDate.toISOString()
        .slice(0, 10),
    ).toBe('2026-08-19');
    expect(
      result
        .find((item) => item.id === 'b')
        ?.earlyStartDate.toISOString()
        .slice(0, 10),
    ).toBe('2026-08-20');

    const saturday = calculateSchedule(
      [{ id: 'a', durationDays: 1 }],
      [],
      new Date('2026-08-22T00:00:00.000Z'),
      [1, 2, 3, 4, 5],
      [],
      [new Date('2026-08-22T00:00:00.000Z')],
    );
    expect(saturday[0].earlyStartDate.toISOString().slice(0, 10)).toBe(
      '2026-08-22',
    );
  });

  it.each([
    ['SS', '2026-08-18'],
    ['FF', '2026-08-19'],
    ['SF', '2026-08-17'],
  ] as const)('calculates %s dependency offsets', (type, expectedStart) => {
    const result = calculateSchedule(
      [
        { id: 'a', durationDays: 3 },
        { id: 'b', durationDays: 2 },
      ],
      [{ predecessorId: 'a', successorId: 'b', type, lagDays: 1 }],
      monday,
      [0, 1, 2, 3, 4, 5, 6],
    );
    expect(
      result
        .find((item) => item.id === 'b')
        ?.earlyStartDate.toISOString()
        .slice(0, 10),
    ).toBe(expectedStart);
  });

  it('calculates non-critical float from the dependency network', () => {
    const result = calculateSchedule(
      [
        { id: 'long', durationDays: 5 },
        { id: 'short', durationDays: 2 },
        { id: 'finish', durationDays: 1 },
      ],
      [
        {
          predecessorId: 'long',
          successorId: 'finish',
          type: 'FS',
          lagDays: 0,
        },
        {
          predecessorId: 'short',
          successorId: 'finish',
          type: 'FS',
          lagDays: 0,
        },
      ],
      monday,
    );
    expect(result.find((item) => item.id === 'long')?.isCritical).toBe(true);
    expect(result.find((item) => item.id === 'short')?.totalFloatDays).toBe(3);
  });

  it('flags but does not overwrite a locked activity that conflicts with a predecessor', () => {
    const result = calculateSchedule(
      [
        { id: 'a', durationDays: 5 },
        {
          id: 'b',
          durationDays: 1,
          plannedStartDate: monday,
          isManuallyScheduled: true,
        },
      ],
      [{ predecessorId: 'a', successorId: 'b', type: 'FS', lagDays: 0 }],
      monday,
    );
    const locked = result.find((item) => item.id === 'b');
    expect(locked?.earlyStartDate.toISOString().slice(0, 10)).toBe(
      '2026-08-17',
    );
    expect(locked?.conflict).toContain('Locked date');
  });
});
