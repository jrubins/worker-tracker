import type { WorkoutSet, WorkoutSummary } from '@app/shared';

/** Sample data for stories and tests. */
const set = (fields: Partial<WorkoutSet> & Pick<WorkoutSet, 'id' | 'position'>): WorkoutSet => ({
  exerciseId: 1,
  exerciseName: 'Bench Press',
  loadType: 'total',
  setType: 'working',
  superset: null,
  weightLb: null,
  reps: null,
  durationSeconds: null,
  rpe: null,
  notes: null,
  loadLb: fields.weightLb ?? null,
  volumeLb: 0,
  e1rmLb: null,
  ...fields,
});

export const warmupSet = set({ id: 1, position: 0, setType: 'warmup', weightLb: 135, reps: 10 });
export const workingSet = set({
  id: 2,
  position: 1,
  weightLb: 225,
  reps: 5,
  rpe: 8,
  volumeLb: 1125,
  e1rmLb: 262.5,
});

export const sampleSets: WorkoutSet[] = [
  warmupSet,
  workingSet,
  set({
    id: 3,
    position: 2,
    weightLb: 225,
    reps: 5,
    rpe: 9,
    notes: 'Grindy last rep',
    volumeLb: 1125,
    e1rmLb: 262.5,
  }),
  set({ id: 4, position: 3, setType: 'drop', weightLb: 185, reps: 6, volumeLb: 1110 }),
  set({
    id: 5,
    position: 4,
    exerciseId: 2,
    exerciseName: 'Weighted Pull-up',
    loadType: 'bodyweight_plus',
    weightLb: 10,
    reps: 6,
    rpe: 8,
    loadLb: 190,
    volumeLb: 1140,
    e1rmLb: 228,
  }),
  set({
    id: 6,
    position: 5,
    exerciseId: 3,
    exerciseName: 'Hammer Curl',
    loadType: 'per_hand',
    weightLb: 35,
    reps: 10,
    volumeLb: 700,
    e1rmLb: 46.7,
  }),
  set({ id: 7, position: 6, exerciseId: 4, exerciseName: 'Plank', durationSeconds: 90 }),
];

/** Bench and rows as superset A, logged round by round, then curls on their own. */
export const supersetSets: WorkoutSet[] = [
  ...[1, 2, 3].flatMap((round) => [
    set({
      id: 100 + round * 2,
      position: round * 2,
      superset: 'A',
      weightLb: 185,
      reps: round === 3 ? 7 : 8,
      volumeLb: 185 * (round === 3 ? 7 : 8),
      e1rmLb: round === 3 ? 228.2 : 234.3,
    }),
    set({
      id: 101 + round * 2,
      position: round * 2 + 1,
      exerciseId: 5,
      exerciseName: 'Barbell Row',
      superset: 'A',
      weightLb: 135,
      reps: 10,
      volumeLb: 1350,
      e1rmLb: 180,
    }),
  ]),
  set({
    id: 110,
    position: 10,
    exerciseId: 3,
    exerciseName: 'Hammer Curl',
    loadType: 'per_hand',
    weightLb: 35,
    reps: 10,
    volumeLb: 700,
    e1rmLb: 46.7,
  }),
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
