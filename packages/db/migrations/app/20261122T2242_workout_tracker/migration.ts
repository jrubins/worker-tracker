#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a225b048d35036ac5d28668261ba5179dbca739648005a3a4e18b9a031e7580f/contract';
import endContract from '../../snapshots/a225b048d35036ac5d28668261ba5179dbca739648005a3a4e18b9a031e7580f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d66c50f1ad3d9edd716db2f69f1e229877832c8c35121487a8f8e43df1253466/contract';
import startContract from '../../snapshots/d66c50f1ad3d9edd716db2f69f1e229877832c8c35121487a8f8e43df1253466/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'Item' }),
      this.createTable({
        schema: 'public',
        table: 'Exercise',
        columns: [
          col('aliases', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('confirmed', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('equipment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nameKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Exercise_aliases_elem_not_null_3676266c',
            sql`array_position("aliases", NULL) IS NULL`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'Routine',
        columns: [
          col('archived', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nameKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'RoutineVersion',
        columns: [
          col('changeNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('routineId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'RoutineVersionExercise',
        columns: [
          col('exerciseId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('routineVersionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('targetReps', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('targetRpe', 'numeric(3,1)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 3, scale: 1 } },
          }),
          col('targetSets', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Workout',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('date', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('durationMinutes', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('routineVersionId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('startedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'WorkoutSet',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('exerciseId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reps', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rpe', 'numeric(3,1)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 3, scale: 1 } },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('warmup', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('weightLb', 'numeric(6,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 6, scale: 2 } },
          }),
          col('workoutId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Exercise',
        constraint: 'Exercise_userId_nameKey_key',
        columns: ['userId', 'nameKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Routine',
        constraint: 'Routine_userId_nameKey_key',
        columns: ['userId', 'nameKey'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RoutineVersion',
        constraint: 'RoutineVersion_routineId_version_key',
        columns: ['routineId', 'version'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoutineVersion',
        index: 'RoutineVersion_routineId_idx_fa038a10',
        columns: ['routineId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoutineVersionExercise',
        index: 'RoutineVersionExercise_exerciseId_idx_3c45a784',
        columns: ['exerciseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'RoutineVersionExercise',
        index: 'RoutineVersionExercise_routineVersionId_idx_02c20e94',
        columns: ['routineVersionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Workout',
        index: 'Workout_routineVersionId_idx_02c20e94',
        columns: ['routineVersionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Workout',
        index: 'Workout_userId_date_idx_b0e9c250',
        columns: ['userId', 'date'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkoutSet',
        index: 'WorkoutSet_exerciseId_idx_3c45a784',
        columns: ['exerciseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkoutSet',
        index: 'WorkoutSet_userId_exerciseId_idx_d4890f32',
        columns: ['userId', 'exerciseId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'WorkoutSet',
        index: 'WorkoutSet_workoutId_idx_7a4e5f00',
        columns: ['workoutId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoutineVersion',
        foreignKey: {
          name: 'RoutineVersion_routineId_fkey',
          columns: ['routineId'],
          references: { schema: 'public', table: 'Routine', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoutineVersionExercise',
        foreignKey: {
          name: 'RoutineVersionExercise_routineVersionId_fkey',
          columns: ['routineVersionId'],
          references: { schema: 'public', table: 'RoutineVersion', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RoutineVersionExercise',
        foreignKey: {
          name: 'RoutineVersionExercise_exerciseId_fkey',
          columns: ['exerciseId'],
          references: { schema: 'public', table: 'Exercise', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Workout',
        foreignKey: {
          name: 'Workout_routineVersionId_fkey',
          columns: ['routineVersionId'],
          references: { schema: 'public', table: 'RoutineVersion', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WorkoutSet',
        foreignKey: {
          name: 'WorkoutSet_workoutId_fkey',
          columns: ['workoutId'],
          references: { schema: 'public', table: 'Workout', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'WorkoutSet',
        foreignKey: {
          name: 'WorkoutSet_exerciseId_fkey',
          columns: ['exerciseId'],
          references: { schema: 'public', table: 'Exercise', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
