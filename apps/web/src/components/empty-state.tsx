import type { ReactNode } from 'react';

/** What a section shows before there's data, and how to get some. */
export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
      <span
        aria-hidden
        className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full [&_svg]:size-5"
      >
        {icon}
      </span>
      <p className="font-medium">{title}</p>
      {children ? (
        <p className="text-muted-foreground max-w-sm text-sm text-balance">{children}</p>
      ) : null}
    </div>
  );
}
