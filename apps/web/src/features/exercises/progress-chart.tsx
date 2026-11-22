import type { ProgressPoint } from '@app/shared';
import { defineChart, lineY } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';
import { formatShortDate } from '@/lib/format';

/** Best estimated one-rep max per session. */
export function ProgressChart({ points }: { points: readonly ProgressPoint[] }) {
  const rows = useMemo(
    () =>
      points
        .filter((point) => point.bestE1rmLb !== null)
        .map((point) => ({ session: formatShortDate(point.date), e1rm: point.bestE1rmLb ?? 0 })),
    [points],
  );
  const definition = useMemo(() => {
    const values = rows.map((row) => row.e1rm);
    // Start near the data, not at zero: the change between sessions is what matters here.
    const min = Math.max(0, Math.floor((Math.min(...values) * 0.9) / 5) * 5);
    const max = Math.ceil((Math.max(...values) * 1.05) / 5) * 5;
    return defineChart({
      marks: [
        lineY(rows, {
          id: 'e1rm',
          x: 'session',
          y: 'e1rm',
          points: true,
          stroke: 'var(--chart-1)',
        }),
      ],
      scales: {
        x: { scale: () => scalePoint<string>().padding(0.3), axis: { label: 'Session' } },
        y: {
          scale: scaleLinear().domain([min, max]),
          grid: true,
          axis: { label: 'Est. 1RM (lb)' },
        },
      },
      tooltip,
    });
  }, [rows]);

  if (rows.length < 2) {
    return (
      <p className="text-muted-foreground text-sm">
        The chart appears after two sessions with weighted working sets.
      </p>
    );
  }
  return (
    <div className="text-muted-foreground">
      <Chart
        definition={definition}
        height={240}
        initialWidth={640}
        ariaLabel="Estimated one-rep max per session"
      />
    </div>
  );
}
