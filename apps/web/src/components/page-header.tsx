import type { ReactNode } from 'react';

interface PageHeaderProps {
  /** Small uppercase line above the title. */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Badges, notes and other details under the title. */
  children?: ReactNode;
  /** Buttons on the right. */
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, children, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0 space-y-2">
        {eyebrow ? <p className="eyebrow text-primary">{eyebrow}</p> : null}
        <h1 className="font-display text-4xl leading-none font-semibold tracking-wide uppercase md:text-5xl">
          {title}
        </h1>
        {children ? (
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
            {children}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </header>
  );
}
