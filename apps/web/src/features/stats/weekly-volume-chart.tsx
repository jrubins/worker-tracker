import type { WeekSummary } from '@app/shared';
import { barY, defineChart } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { ChartColumn } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/empty-state';
import { formatCompact, formatNumber, formatShortDate } from '@/lib/format';

/** Working volume (lb) per week, oldest first; the current (last) week is highlighted. */
export function WeeklyVolumeChart({ weeks }: { weeks: readonly WeekSummary[] }) {
  const rows = useMemo(
    () =>
      weeks.map((week, index) => ({
        week: formatShortDate(week.weekStart),
        volume: week.volumeLb,
        sessions: week.sessions,
        workingSets: week.workingSets,
        current: index === weeks.length - 1,
      })),
    [weeks],
  );
  const definition = useMemo(() => {
    const max = Math.max(1, ...rows.map((row) => row.volume));
    return defineChart({
      marks: [
        barY(rows, {
          x: 'week',
          y: 'volume',
          inset: 3,
          maxThickness: 44,
          radius: { end: 6 },
          fill: (row) => (row.current ? 'var(--chart-1)' : 'var(--chart-muted)'),
        }),
      ],
      scales: {
        x: {
          scale: () =>
            scaleBand<string>()
              .domain(rows.map((row) => row.week))
              .padding(0.25),
          axis: { ticks: { line: false } },
        },
        y: {
          scale: scaleLinear().domain([0, max]),
          nice: true,
          grid: { stroke: 'var(--chart-grid)' },
          axis: { line: false, ticks: { line: false, count: 4, format: formatCompact } },
        },
      },
      // A tap anywhere in a week's column shows that week.
      focus: 'nearest-x',
      maxFocusDistance: Number.POSITIVE_INFINITY,
      tooltip: {
        use: tooltip,
        content: ([point]) => {
          const row = point?.datum;
          if (!row) return { rows: [] };
          return {
            title: `Week of ${row.week}`,
            rows: [
              { label: 'Volume', value: `${formatNumber(row.volume)} lb` },
              { label: 'Sessions', value: String(row.sessions) },
              { label: 'Working sets', value: String(row.workingSets) },
            ],
          };
        },
      },
    });
  }, [rows]);

  if (rows.every((row) => row.volume === 0)) {
    return (
      <EmptyState icon={<ChartColumn />} title="No training logged in these weeks yet.">
        Ask Claude to log a workout and your weekly volume shows up here.
      </EmptyState>
    );
  }
  return (
    <div className="text-muted-foreground">
      <Chart definition={definition} height={220} initialWidth={560} ariaLabel="Weekly volume" />
    </div>
  );
}
