import { useSuspenseQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { RecentPrs } from '@/features/stats/recent-prs';
import { dashboardQueryOptions } from '@/features/stats/queries';
import { WeeklyVolumeChart } from '@/features/stats/weekly-volume-chart';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
    </div>
  );
}

export function HomePage() {
  const { data } = useSuspenseQuery(dashboardQueryOptions);
  const thisWeek = data.weekly.weeks.at(-1);
  const streak = data.weekly.streakWeeks;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">This week</h1>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Sessions" value={String(thisWeek?.sessions ?? 0)} />
        <Stat label="Working sets" value={String(thisWeek?.workingSets ?? 0)} />
        <Stat label="Volume" value={`${formatNumber(thisWeek?.volumeLb ?? 0)} lb`} />
        <Stat label="Streak" value={`${streak} ${streak === 1 ? 'week' : 'weeks'}`} />
      </dl>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Weekly volume</h2>
          </CardTitle>
          <CardDescription>Working sets only, last 8 weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyVolumeChart weeks={data.weekly.weeks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Recent personal records</h2>
          </CardTitle>
          <CardDescription>New best estimated 1RMs in the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentPrs prs={data.recentPrs} />
        </CardContent>
      </Card>
    </div>
  );
}
