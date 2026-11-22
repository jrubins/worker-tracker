import type { RoutineVersion } from '@app/shared';

export const versionTwo: RoutineVersion = {
  id: 2,
  version: 2,
  notes: 'Heavy pressing day',
  changeNote: 'Swapped overhead press for dips: shoulder irritation',
  createdAt: '2026-11-10T18:00:00.000Z',
  exercises: [
    {
      exerciseId: 1,
      exerciseName: 'Bench Press',
      position: 0,
      targetSets: 4,
      targetReps: '5',
      targetRpe: 8,
      notes: null,
    },
    {
      exerciseId: 4,
      exerciseName: 'Dips',
      position: 1,
      targetSets: 3,
      targetReps: '8-12',
      targetRpe: null,
      notes: 'Add weight past 12',
    },
  ],
};

export const versionOne: RoutineVersion = {
  ...versionTwo,
  id: 1,
  version: 1,
  changeNote: 'Created',
  createdAt: '2026-10-01T18:00:00.000Z',
  exercises: [
    {
      exerciseId: 1,
      exerciseName: 'Bench Press',
      position: 0,
      targetSets: 4,
      targetReps: '5',
      targetRpe: 8,
      notes: null,
    },
    {
      exerciseId: 5,
      exerciseName: 'Overhead Press',
      position: 1,
      targetSets: 3,
      targetReps: '8-10',
      targetRpe: null,
      notes: null,
    },
  ],
};
