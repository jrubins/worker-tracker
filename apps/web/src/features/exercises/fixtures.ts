import type { Exercise, PersonalRecords, ProgressPoint } from '@app/shared';

export const sampleExercises: Exercise[] = [
  {
    id: 1,
    name: 'Bench Press',
    aliases: ['bench', 'BP'],
    equipment: 'barbell',
    notes: null,
    confirmed: true,
  },
  { id: 2, name: 'Incline DB Bench', aliases: [], equipment: null, notes: null, confirmed: false },
  { id: 3, name: 'Squat', aliases: [], equipment: 'barbell', notes: null, confirmed: true },
];

export const sampleRecords: PersonalRecords = {
  exerciseId: 3,
  exerciseName: 'Squat',
  bestE1rm: { weightLb: 315, reps: 5, e1rmLb: 367.5, date: '2026-11-20', workoutId: 12 },
  heaviest: { weightLb: 335, reps: 2, e1rmLb: 357.3, date: '2026-11-06', workoutId: 9 },
  repMaxes: [
    { weightLb: 335, reps: 2, e1rmLb: 357.3, date: '2026-11-06', workoutId: 9 },
    { weightLb: 315, reps: 5, e1rmLb: 367.5, date: '2026-11-20', workoutId: 12 },
    { weightLb: 275, reps: 8, e1rmLb: 348.3, date: '2026-10-30', workoutId: 8 },
  ],
};

const point = (date: string, e1rm: number): ProgressPoint => ({
  date,
  workoutId: 1,
  topSetWeightLb: Math.round(e1rm * 0.86),
  topSetReps: 5,
  bestE1rmLb: e1rm,
  volumeLb: 4000,
  workingSets: 4,
});

export const sampleProgress: ProgressPoint[] = [
  point('2026-10-02', 336),
  point('2026-10-09', 341),
  point('2026-10-16', 339),
  point('2026-10-23', 348),
  point('2026-10-30', 352),
  point('2026-11-06', 357),
  point('2026-11-13', 361),
  point('2026-11-20', 367.5),
];
