import { SET_TYPES, type SetType, type UpdateSet, type WorkoutSet } from '@app/shared';
import { useForm } from '@tanstack/react-form';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from 'cn';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber, formatSet } from '@/lib/format';

const wholeNumber = z.string().regex(/^(\d+)?$/, 'A whole number');

/** The form edits text; it becomes an UpdateSet on save. */
const SetFormSchema = z
  .object({
    weight: z.string().regex(/^(\d+(\.\d+)?)?$/, 'A number, or empty for none'),
    reps: wholeNumber,
    seconds: wholeNumber,
    rpe: z
      .string()
      .refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 10 && (Number(v) * 2) % 1 === 0), {
        message: '1 to 10, in half steps',
      }),
    setType: z.enum(SET_TYPES),
  })
  .refine((v) => v.reps !== '' || (v.seconds !== '' && Number(v.seconds) > 0), {
    message: 'Give reps, a time, or both',
    path: ['reps'],
  });

const SET_TYPE_LABELS: Record<SetType, string> = {
  working: 'Working',
  warmup: 'Warm-up',
  drop: 'Drop set',
};

const weightLabel = (loadType: WorkoutSet['loadType']) =>
  loadType === 'per_hand'
    ? 'Weight per hand (lb)'
    : loadType === 'bodyweight_plus'
      ? 'Added weight (lb)'
      : 'Weight (lb)';

interface SetEditorProps {
  set: WorkoutSet;
  /** How the set is named for screen readers and buttons: "set 2", "drop set after set 3". */
  label: string;
  /** Shown in the margin: the set's number, or ↳ for a drop set. */
  marker: string;
  onSave: (changes: UpdateSet) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}

/** One logged set: shown as text, with inline editing to fix mistakes. */
export function SetEditor({ set, label, marker, onSave, onDelete }: SetEditorProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'confirm-delete'>('view');
  const [deleting, setDeleting] = useState(false);
  const form = useForm({
    defaultValues: {
      weight: set.weightLb === null ? '' : String(set.weightLb),
      reps: set.reps === null ? '' : String(set.reps),
      seconds: set.durationSeconds === null ? '' : String(set.durationSeconds),
      rpe: set.rpe === null ? '' : String(set.rpe),
      setType: set.setType,
    },
    validators: { onSubmit: SetFormSchema },
    onSubmit: async ({ value }) => {
      await onSave({
        weightLb: value.weight === '' ? null : Number(value.weight),
        reps: value.reps === '' ? null : Number(value.reps),
        durationSeconds: value.seconds === '' ? null : Number(value.seconds),
        rpe: value.rpe === '' ? null : Number(value.rpe),
        setType: value.setType,
      });
      setMode('view');
    },
  });
  const muted = set.setType !== 'working';

  if (mode === 'confirm-delete') {
    return (
      <div
        role="group"
        aria-label={`Delete ${label}?`}
        className="border-destructive/40 bg-destructive/10 -mx-2 my-1 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2"
      >
        <span className="text-sm">
          Delete {label}{' '}
          <span className="text-muted-foreground tabular-nums">({formatSet(set)})</span>?
        </span>
        <span className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMode('view')}>
            Keep it
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleting}
            onClick={() => {
              setDeleting(true);
              void onDelete().finally(() => setDeleting(false));
            }}
          >
            Delete
          </Button>
        </span>
      </div>
    );
  }

  if (mode === 'view') {
    return (
      <div className={cn('flex items-center gap-3 py-2', set.setType === 'drop' && 'pl-4')}>
        <span
          aria-hidden
          className="text-muted-foreground w-5 text-center text-xs font-semibold tabular-nums"
        >
          {marker}
        </span>
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn('font-medium tabular-nums', muted && 'text-muted-foreground')}>
            {formatSet(set)}
          </span>
          {set.setType === 'working' ? null : (
            <Badge variant="outline" className="text-muted-foreground">
              {SET_TYPE_LABELS[set.setType]}
            </Badge>
          )}
          {set.notes ? <span className="text-muted-foreground text-sm">{set.notes}</span> : null}
        </span>
        {set.e1rmLb === null ? null : (
          <span className="text-muted-foreground hidden text-xs tabular-nums sm:inline">
            e1RM {formatNumber(set.e1rmLb)}
          </span>
        )}
        <span className="flex">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground size-8"
            aria-label={`Edit ${label}`}
            onClick={() => setMode('edit')}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-8"
            aria-label={`Delete ${label}`}
            onClick={() => setMode('confirm-delete')}
          >
            <Trash2 />
          </Button>
        </span>
      </div>
    );
  }

  const field = (name: 'weight' | 'reps' | 'seconds' | 'rpe', fieldLabel: string) => (
    <form.Field name={name}>
      {(f) => {
        const error = f.state.meta.errors[0]?.message;
        const id = `set-${set.id}-${name}`;
        return (
          <div className="min-w-0 space-y-1">
            <Label htmlFor={id}>{fieldLabel}</Label>
            <Input
              id={id}
              inputMode="decimal"
              value={f.state.value}
              onChange={(event) => f.handleChange(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${id}-error` : undefined}
            />
            {error ? (
              <p id={`${id}-error`} className="text-destructive text-xs">
                {error}
              </p>
            ) : null}
          </div>
        );
      }}
    </form.Field>
  );

  return (
    <form
      className="grid grid-cols-2 items-end gap-3 py-3 sm:grid-cols-5"
      aria-label={`Edit ${label}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <p className="text-muted-foreground col-span-full text-xs font-semibold tracking-wide uppercase">
        Edit {label}
      </p>
      {field('weight', weightLabel(set.loadType))}
      {field('reps', 'Reps')}
      {field('seconds', 'Time (seconds)')}
      {field('rpe', 'RPE')}
      <form.Field name="setType">
        {(f) => {
          const id = `set-${set.id}-type`;
          return (
            <div className="col-span-2 min-w-0 space-y-1 sm:col-span-1">
              <Label htmlFor={id}>Set type</Label>
              <select
                id={id}
                className="border-input bg-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
                value={f.state.value}
                onChange={(event) => {
                  const value = SET_TYPES.find((type) => type === event.target.value);
                  if (value) f.handleChange(value);
                }}
              >
                {SET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {SET_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          );
        }}
      </form.Field>
      <div className="col-span-full flex gap-2 sm:justify-end">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="sm" className="flex-1 sm:flex-none" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          )}
        </form.Subscribe>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="flex-1 sm:flex-none"
          onClick={() => setMode('view')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
