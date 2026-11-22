import type { WeekSummary } from '@app/shared';
import { barY, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';
import { formatShortDate } from '@/lib/format';

/** Working volume (lb) per week, oldest first. */
export function WeeklyVolumeChart({ weeks }: { weeks: readonly WeekSummary[] }) {
  const rows = useMemo(
    () => weeks.map((week) => ({ week: formatShortDate(week.weekStart), volume: week.volumeLb })),
    [weeks],
  );
  const definition = useMemo(() => {
    const max = Math.max(1, ...rows.map((row) => row.volume));
    return defineChart({
      marks: [barY(rows, { x: 'week', y: 'volume', inset: 2, fill: 'var(--chart-1)' })],
      scales: {
        x: {
          scale: () =>
            scaleBand<string>()
              .domain(rows.map((row) => row.week))
              .padding(0.2),
          axis: { label: 'Week of' },
        },
        y: {
          scale: scaleLinear().domain([0, max]),
          nice: true,
          grid: true,
          axis: { label: 'Volume (lb)' },
        },
      },
      tooltip,
    });
  }, [rows]);

  if (rows.every((row) => row.volume === 0)) {
    return <p className="text-muted-foreground text-sm">No training logged in these weeks yet.</p>;
  }
  return (
    <div className="text-muted-foreground">
      <Chart definition={definition} height={220} initialWidth={640} ariaLabel="Weekly volume" />
    </div>
  );
}
