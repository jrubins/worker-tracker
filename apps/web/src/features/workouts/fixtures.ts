import type { WorkoutSet, WorkoutSummary } from '@app/shared';

/** Sample data for stories and tests. */
export const warmupSet: WorkoutSet = {
  id: 1,
  exerciseId: 1,
  exerciseName: 'Bench Press',
  position: 0,
  weightLb: 135,
  reps: 10,
  rpe: null,
  warmup: true,
  notes: null,
  e1rmLb: null,
};
export const workingSet: WorkoutSet = {
  id: 2,
  exerciseId: 1,
  exerciseName: 'Bench Press',
  position: 1,
  weightLb: 225,
  reps: 5,
  rpe: 8,
  warmup: false,
  notes: null,
  e1rmLb: 262.5,
};

export const sampleSets: WorkoutSet[] = [
  warmupSet,
  workingSet,
  {
    id: 3,
    exerciseId: 1,
    exerciseName: 'Bench Press',
    position: 2,
    weightLb: 225,
    reps: 5,
    rpe: 9,
    warmup: false,
    notes: 'Grindy last rep',
    e1rmLb: 262.5,
  },
  {
    id: 4,
    exerciseId: 2,
    exerciseName: 'Pull-ups',
    position: 3,
    weightLb: null,
    reps: 10,
    rpe: 8,
    warmup: false,
    notes: null,
    e1rmLb: null,
  },
];

export const sampleWorkouts: WorkoutSummary[] = [
  {
    id: 12,
    date: '2026-11-20',
    routineName: 'Push A',
    exerciseNames: ['Bench Press', 'Overhead Press', 'Dips'],
    workingSets: 11,
    volumeLb: 12_450,
  },
  {
    id: 11,
    date: '2026-11-18',
    routineName: null,
    exerciseNames: ['Squat', 'Romanian Deadlift'],
    workingSets: 8,
    volumeLb: 15_300,
  },
];
