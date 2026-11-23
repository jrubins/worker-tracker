/** A tiny decorative trend line (the numbers are shown elsewhere, so it's hidden from screen readers). */
export function Sparkline({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const width = 100;
  const height = 28;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - 2 - ((value - min) / range) * (height - 4),
  ]);
  const line = points.map(([x, y]) => `${x},${y}`).join(' ');
  const last = points.at(-1) ?? [0, 0];
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
    >
      <polygon
        points={`0,${height} ${line} ${width},${height}`}
        fill="var(--chart-1)"
        opacity={0.12}
      />
      <polyline
        points={line}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={2.25} fill="var(--chart-1)" />
    </svg>
  );
}
