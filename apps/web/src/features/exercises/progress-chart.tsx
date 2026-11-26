import type { LoadType, ProgressPoint } from '@app/shared';
import { areaY, defineChart, lineY } from '@tanstack/charts';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { crosshair } from '@tanstack/charts/crosshair';
import { decorative } from '@tanstack/charts/mark/decorative';
import { tooltip } from '@tanstack/charts/tooltip';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { EmptyState } from '@/components/empty-state';
import { formatDate, formatLoad, formatNumber, formatShortDate } from '@/lib/format';

interface ProgressChartProps {
  points: readonly ProgressPoint[];
  /** How the exercise's weights read in the tooltip ("40 lb ea", "BW + 25 lb"). */
  loadType?: LoadType;
}

/** Best estimated one-rep max per session. */
export function ProgressChart({ points, loadType = 'total' }: ProgressChartProps) {
  const rows = useMemo(
    () =>
      points
        .filter((point) => point.bestE1rmLb !== null)
        .map((point) => ({
          session: formatShortDate(point.date),
          date: point.date,
          e1rm: point.bestE1rmLb ?? 0,
          topSet:
            point.topSetReps === null
              ? null
              : `${formatLoad(point.topSetWeightLb, loadType)} × ${point.topSetReps}`,
          workingSets: point.workingSets,
        })),
    [points, loadType],
  );
  const definition = useMemo(() => {
    // The scale needs data: below two sessions the empty state shows instead.
    if (rows.length < 2) return null;
    const values = rows.map((row) => row.e1rm);
    // Start near the data, not at zero: the change between sessions is what matters here.
    const min = Math.max(0, Math.floor((Math.min(...values) * 0.9) / 5) * 5);
    const max = Math.ceil((Math.max(...values) * 1.05) / 5) * 5;
    return defineChart({
      marks: [
        // The fill only shades under the line; the line's points own focus and the tooltip.
        decorative(
          areaY(rows, {
            x: 'session',
            y: 'e1rm',
            y1: min,
            fill: 'var(--chart-1)',
            fillOpacity: 0.12,
          }),
        ),
        lineY(rows, {
          id: 'e1rm',
          x: 'session',
          y: 'e1rm',
          points: true,
          stroke: 'var(--chart-1)',
          strokeWidth: 2.5,
        }),
        crosshair({ x: { stroke: 'var(--chart-grid)' }, y: false }),
      ],
      scales: {
        x: {
          scale: () => scalePoint<string>().padding(0.3),
          axis: { ticks: { line: false } },
        },
        y: {
          scale: scaleLinear().domain([min, max]),
          grid: { stroke: 'var(--chart-grid)' },
          axis: { line: false, ticks: { line: false, count: 4 } },
        },
      },
      // A tap anywhere above a session shows that session.
      focus: 'nearest-x',
      maxFocusDistance: Number.POSITIVE_INFINITY,
      tooltip: {
        use: tooltip,
        content: ([point]) => {
          const row = point?.datum;
          if (!row) return { rows: [] };
          return {
            title: formatDate(row.date),
            rows: [
              { label: 'Est. 1RM', value: `${formatNumber(row.e1rm)} lb` },
              ...(row.topSet ? [{ label: 'Top set', value: row.topSet }] : []),
              { label: 'Working sets', value: String(row.workingSets) },
            ],
          };
        },
      },
    });
  }, [rows]);

  if (!definition) {
    return (
      <EmptyState icon={<TrendingUp />} title="Not enough sessions yet.">
        The chart appears after two sessions with an estimated 1RM (weighted working sets; for
        weighted bodyweight lifts, once your bodyweight is logged).
      </EmptyState>
    );
  }
  return (
    <div className="text-muted-foreground">
      <Chart
        definition={definition}
        height={240}
        initialWidth={560}
        ariaLabel="Estimated one-rep max per session"
      />
    </div>
  );
}
