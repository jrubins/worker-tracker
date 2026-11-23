import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Sparkline } from './sparkline';

interface StatTileProps {
  label: string;
  value: string;
  unit?: string;
  /** A short comparison line, e.g. "+8% vs last week"; its sign picks the colour and arrow. */
  change?: { direction: 'up' | 'down' | 'flat'; text: string } | null;
  /** Values over time (oldest first) for a small trend line. */
  trend?: readonly number[];
  icon?: ReactNode;
  className?: string;
}

/** One headline number. Render inside a <dl>. */
export function StatTile({ label, value, unit, change, trend, icon, className }: StatTileProps) {
  return (
    <div
      className={cn(
        'bg-card relative flex flex-col gap-2 overflow-hidden rounded-xl border p-4',
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className="text-muted-foreground absolute top-4 right-4 [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <dt className="eyebrow">{label}</dt>
      <dd className="font-display text-4xl leading-none font-semibold">
        {value}
        {unit ? (
          <>
            {' '}
            <span className="text-muted-foreground font-sans text-sm font-medium">{unit}</span>
          </>
        ) : null}
      </dd>
      {change ? (
        <dd
          className={cn(
            'flex items-center gap-1 text-xs font-medium',
            change.direction === 'up' && 'text-primary',
            change.direction === 'down' && 'text-highlight',
            change.direction === 'flat' && 'text-muted-foreground',
          )}
        >
          {change.direction === 'up' ? <ArrowUpRight aria-hidden className="size-3.5" /> : null}
          {change.direction === 'down' ? <ArrowDownRight aria-hidden className="size-3.5" /> : null}
          {change.text}
        </dd>
      ) : null}
      {trend ? <Sparkline values={trend} className="mt-auto h-7 w-full" /> : null}
    </div>
  );
}
