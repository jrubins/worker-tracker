import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Flame } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatTile } from '@/components/stat-tile';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { describeChange, formatNumber, formatWeekRange } from '@/lib/format';
import { RecentPrs } from '@/features/stats/recent-prs';
import { dashboardQueryOptions } from '@/features/stats/queries';
import { WeeklyVolumeChart } from '@/features/stats/weekly-volume-chart';
import { WorkoutList } from '@/features/workouts/workout-list';
import { workoutsQueryOptions } from '@/features/workouts/queries';

const EMPTY_WEEK = { sessions: 0, workingSets: 0, volumeLb: 0 };

export function HomePage() {
  const { data } = useSuspenseQuery(dashboardQueryOptions);
  const { data: workouts } = useSuspenseQuery(workoutsQueryOptions);
  const weeks = data.weekly.weeks;
  const thisWeek = weeks.at(-1) ?? { ...EMPTY_WEEK, weekStart: data.today };
  const lastWeek = weeks.at(-2) ?? EMPTY_WEEK;
  const streak = data.weekly.streakWeeks;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={formatWeekRange(thisWeek.weekStart)} title="This week">
        {streak > 0 ? (
          <Badge className="bg-highlight/15 text-highlight">
            <Flame />
            {streak}-week streak
          </Badge>
        ) : (
          <span>Log a session this week to start a streak.</span>
        )}
      </PageHeader>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Sessions"
          value={String(thisWeek.sessions)}
          change={describeChange(thisWeek.sessions, lastWeek.sessions)}
          trend={weeks.map((week) => week.sessions)}
        />
        <StatTile
          label="Working sets"
          value={String(thisWeek.workingSets)}
          change={describeChange(thisWeek.workingSets, lastWeek.workingSets)}
          trend={weeks.map((week) => week.workingSets)}
        />
        <StatTile
          label="Volume"
          value={formatNumber(thisWeek.volumeLb)}
          unit="lb"
          change={describeChange(thisWeek.volumeLb, lastWeek.volumeLb, { percent: true })}
          trend={weeks.map((week) => week.volumeLb)}
        />
        <StatTile
          label="Streak"
          value={String(streak)}
          unit={streak === 1 ? 'week' : 'weeks'}
          icon={<Flame />}
          change={{ direction: 'flat', text: 'Weeks in a row with a session' }}
        />
      </dl>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>
              <h2>Weekly volume</h2>
            </CardTitle>
            <CardDescription>Working sets only, last 8 weeks.</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyVolumeChart weeks={weeks} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              <h2>Recent records</h2>
            </CardTitle>
            <CardDescription>New best estimated 1RMs in the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentPrs prs={data.recentPrs} />
          </CardContent>
        </Card>
      </div>

      <section aria-labelledby="recent-workouts" className="space-y-3">
        <div className="flex items-end justify-between">
          <h2
            id="recent-workouts"
            className="font-display text-xl font-semibold tracking-wide uppercase"
          >
            Recent workouts
          </h2>
          {workouts.length > 3 ? (
            <Link
              to="/history"
              className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
            >
              All history <ArrowRight className="size-4" />
            </Link>
          ) : null}
        </div>
        <WorkoutList workouts={workouts.slice(0, 3)} />
      </section>
    </div>
  );
}
