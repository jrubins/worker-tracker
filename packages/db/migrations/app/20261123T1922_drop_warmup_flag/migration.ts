#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/04bc4242950eb199b2a59e40ede6d9c1c69fc2d5afa3775ead566928d0b38a28/contract';
import startContract from '../../snapshots/04bc4242950eb199b2a59e40ede6d9c1c69fc2d5afa3775ead566928d0b38a28/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/64f6dcd3989ce9826c6f550caa8feb24f206df30f865b90e1af2ad13766683ed/contract';
import endContract from '../../snapshots/64f6dcd3989ce9826c6f550caa8feb24f206df30f865b90e1af2ad13766683ed/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropColumn({ schema: 'public', table: 'WorkoutSet', column: 'warmup' }),
      this.setDefault({
        schema: 'public',
        table: 'WorkoutSet',
        column: col('setType', 'text', {
          default: lit('working'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
