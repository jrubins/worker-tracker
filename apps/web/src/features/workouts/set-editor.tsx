import type { UpdateSet, WorkoutSet } from '@app/shared';
import { useForm } from '@tanstack/react-form';
import { Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatNumber, formatSet } from '@/lib/format';

/** The form edits text; it becomes an UpdateSet on save. */
const SetFormSchema = z.object({
  weight: z.string().regex(/^(\d+(\.\d+)?)?$/, 'A number, or empty for bodyweight'),
  reps: z.string().regex(/^\d+$/, 'A whole number'),
  rpe: z
    .string()
    .refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 10 && (Number(v) * 2) % 1 === 0), {
      message: '1 to 10, in half steps',
    }),
  warmup: z.boolean(),
});

interface SetEditorProps {
  set: WorkoutSet;
  /** 1-based number of the set within its exercise. */
  number: number;
  onSave: (changes: UpdateSet) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}

/** One logged set: shown as text, with inline editing to fix mistakes. */
export function SetEditor({ set, number, onSave, onDelete }: SetEditorProps) {
  const [editing, setEditing] = useState(false);
  const form = useForm({
    defaultValues: {
      weight: set.weightLb === null ? '' : String(set.weightLb),
      reps: String(set.reps),
      rpe: set.rpe === null ? '' : String(set.rpe),
      warmup: set.warmup,
    },
    validators: { onSubmit: SetFormSchema },
    onSubmit: async ({ value }) => {
      await onSave({
        weightLb: value.weight === '' ? null : Number(value.weight),
        reps: Number(value.reps),
        rpe: value.rpe === '' ? null : Number(value.rpe),
        warmup: value.warmup,
      });
      setEditing(false);
    },
  });

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-1.5">
        <span className="text-muted-foreground w-6 text-sm">{number}</span>
        <span className="flex-1">
          {formatSet(set)}
          {set.warmup ? (
            <Badge variant="outline" className="ml-2">
              Warm-up
            </Badge>
          ) : null}
          {set.notes ? (
            <span className="text-muted-foreground ml-2 text-sm">{set.notes}</span>
          ) : null}
        </span>
        {set.e1rmLb === null ? null : (
          <span className="text-muted-foreground hidden text-xs sm:inline">
            e1RM {formatNumber(set.e1rmLb)}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit set ${number}`}
          onClick={() => setEditing(true)}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete set ${number}`}
          onClick={() => void onDelete()}
        >
          <Trash2 />
        </Button>
      </div>
    );
  }

  const field = (name: 'weight' | 'reps' | 'rpe', label: string) => (
    <form.Field name={name}>
      {(f) => {
        const error = f.state.meta.errors[0]?.message;
        const id = `set-${set.id}-${name}`;
        return (
          <div className="w-28 space-y-1">
            <Label htmlFor={id}>{label}</Label>
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
      className="flex flex-wrap items-end gap-3 py-2"
      aria-label={`Edit set ${number}`}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {field('weight', 'Weight (lb)')}
      {field('reps', 'Reps')}
      {field('rpe', 'RPE')}
      <form.Field name="warmup">
        {(f) => (
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={f.state.value}
              onChange={(event) => f.handleChange(event.target.checked)}
            />
            Warm-up
          </label>
        )}
      </form.Field>
      <div className="flex gap-2 pb-0.5">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          )}
        </form.Subscribe>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
