import { ExerciseLinkSchema, type ExerciseLink } from '@app/shared';
import { useForm } from '@tanstack/react-form';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** The form edits text; an empty label means none. */
const LinkFormSchema = z.object({
  url: ExerciseLinkSchema.shape.url,
  label: z.string().trim().max(120),
});

/** A readable name for a link without a label: its site, e.g. "youtube.com". */
const siteOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

interface ExerciseLinksProps {
  links: readonly ExerciseLink[];
  /** Saves the whole new list. */
  onChange: (links: ExerciseLink[]) => Promise<unknown>;
}

/** An exercise's references (how-to videos, articles): open, add and remove them. */
export function ExerciseLinks({ links, onChange }: ExerciseLinksProps) {
  const [adding, setAdding] = useState(false);
  const form = useForm({
    defaultValues: { url: '', label: '' },
    validators: { onSubmit: LinkFormSchema },
    onSubmit: async ({ value }) => {
      await onChange([...links, { url: value.url.trim(), label: value.label.trim() || null }]);
      form.reset();
      setAdding(false);
    },
  });

  return (
    <div className="space-y-4">
      {links.length === 0 && !adding ? (
        <EmptyState icon={<Link2 />} title="No references yet.">
          Save a how-to video or article here, or ask Claude to add one.
        </EmptyState>
      ) : (
        <ul className="divide-y">
          {links.map((link) => (
            <li key={link.url} className="flex items-center gap-3 py-2">
              <ExternalLink className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate font-medium hover:underline"
              >
                {link.label ?? siteOf(link.url)}
                {link.label ? (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    {siteOf(link.url)}
                  </span>
                ) : null}
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive size-8"
                aria-label={`Remove ${link.label ?? siteOf(link.url)}`}
                onClick={() => void onChange(links.filter((other) => other.url !== link.url))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form
          className="flex flex-wrap items-end gap-3"
          aria-label="Add a reference"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          {(['url', 'label'] as const).map((name) => (
            <form.Field key={name} name={name}>
              {(field) => {
                const id = `link-${name}`;
                const error = field.state.meta.errors[0]?.message;
                return (
                  <div
                    className={
                      name === 'url' ? 'min-w-56 flex-[2] space-y-1' : 'min-w-40 flex-1 space-y-1'
                    }
                  >
                    <Label htmlFor={id}>
                      {name === 'url' ? 'Web address' : 'Label (optional)'}
                    </Label>
                    <Input
                      id={id}
                      type={name === 'url' ? 'url' : 'text'}
                      placeholder={name === 'url' ? 'https://www.youtube.com/…' : 'Form video'}
                      value={field.state.value}
                      onChange={(event) => field.handleChange(event.target.value)}
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
          ))}
          <div className="flex gap-2 pb-0.5">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save link'}
                </Button>
              )}
            </form.Subscribe>
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus />
          Add link
        </Button>
      )}
    </div>
  );
}
