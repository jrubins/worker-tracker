#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/528d6b3e4a80dfe9987f1da834073a590bfda000e3801e5b2f235d97dd66f570/contract';
import endContract from '../../snapshots/528d6b3e4a80dfe9987f1da834073a590bfda000e3801e5b2f235d97dd66f570/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/64f6dcd3989ce9826c6f550caa8feb24f206df30f865b90e1af2ad13766683ed/contract';
import startContract from '../../snapshots/64f6dcd3989ce9826c6f550caa8feb24f206df30f865b90e1af2ad13766683ed/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'RoutineVersionExercise',
        column: col('superset', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'WorkoutSet',
        column: col('superset', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
