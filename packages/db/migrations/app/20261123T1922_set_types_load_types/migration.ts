#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/04bc4242950eb199b2a59e40ede6d9c1c69fc2d5afa3775ead566928d0b38a28/contract';
import endContract from '../../snapshots/04bc4242950eb199b2a59e40ede6d9c1c69fc2d5afa3775ead566928d0b38a28/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a225b048d35036ac5d28668261ba5179dbca739648005a3a4e18b9a031e7580f/contract';
import startContract from '../../snapshots/a225b048d35036ac5d28668261ba5179dbca739648005a3a4e18b9a031e7580f/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  lit,
  sql,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';
import { contractFromJson } from '@prisma/orm-postgres/static';

const { sql: db, contract } = postgres({ contract: contractFromJson<End>(endContract) });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Exercise',
        column: col('loadType', 'text', {
          notNull: true,
          default: lit('total'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Workout',
        column: col('bodyweightLb', 'numeric(5,1)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 1 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'WorkoutSet',
        column: col('durationSeconds', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Exercise',
        column: col('links', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
      }),
      this.dataTransform(contract, 'backfill-Exercise-links', {
        backfillsColumn: { schema: 'public', table: 'Exercise', column: 'links' },
        // Existing exercises start with no links.
        check: () => db.public.Exercise.select('id').where((f, fns) => fns.eq(f.links, null)).limit(1),
        run: () => db.public.Exercise.update({ links: [] }).where((f, fns) => fns.eq(f.links, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Exercise', column: 'links' }),
      this.addColumn({
        schema: 'public',
        table: 'WorkoutSet',
        column: col('setType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-WorkoutSet-setType', {
        backfillsColumn: { schema: 'public', table: 'WorkoutSet', column: 'setType' },
        // Warm-ups keep being warm-ups; every other existing set is a working set.
        check: () =>
          db.public.WorkoutSet.select('id').where((f, fns) => fns.eq(f.setType, null)).limit(1),
        run: [
          () =>
            db.public.WorkoutSet.update({ setType: 'warmup' }).where((f, fns) =>
              fns.and(fns.eq(f.setType, null), fns.eq(f.warmup, true)),
            ),
          () =>
            db.public.WorkoutSet.update({ setType: 'working' }).where((f, fns) =>
              fns.eq(f.setType, null),
            ),
        ],
      }),
      this.setNotNull({ schema: 'public', table: 'WorkoutSet', column: 'setType' }),
      this.dropNotNull({ schema: 'public', table: 'WorkoutSet', column: 'reps' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Exercise',
        constraint: 'Exercise_links_shape_1941eeb2',
        expression: sql`jsonb_path_match("links", 'strict $.type() == "array" && !exists($[*] ? (!((@.type() == "object" && !exists(@.keyvalue() ? (@.key == "label" && !(@.value.type() == "null" || (@.value.type() == "string")))) && exists(@.keyvalue() ? (@.key == "url" && (@.value.type() == "string"))) && !exists(@.keyvalue() ? (@.key != "label" && @.key != "url"))))))') IS TRUE`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Exercise',
        constraint: 'Exercise_loadType_check_c8470ebe',
        expression: sql`"loadType" IN ('total', 'per_hand', 'bodyweight_plus')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'WorkoutSet',
        constraint: 'WorkoutSet_setType_check_76f77917',
        expression: sql`"setType" IN ('working', 'warmup', 'drop')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
